import { Router } from "express";
import { db, usersTable, tasksTable, taskCompletionsTable, taskUnlockPaymentsTable } from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { authenticate, optionalAuth } from "../lib/auth.js";
import * as plisio from "../lib/plisio.js";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function isUserUnlocked(userId: number): Promise<boolean> {
  const [payment] = await db
    .select({ id: taskUnlockPaymentsTable.id })
    .from(taskUnlockPaymentsTable)
    .where(and(
      eq(taskUnlockPaymentsTable.userId, userId),
      eq(taskUnlockPaymentsTable.status, "completed"),
    ))
    .limit(1);
  return !!payment;
}

async function getUnlockFee(): Promise<number> {
  try {
    const { siteSettingsTable } = await import("@workspace/db");
    const [s] = await db.select({ fee: siteSettingsTable.taskUnlockFee }).from(siteSettingsTable).limit(1);
    return parseFloat(String(s?.fee ?? "0.5")) || 0.5;
  } catch {
    return 0.5;
  }
}

// ─── Unlock Payment ───────────────────────────────────────────────────────────

// GET /tasks/unlock-status
router.get("/unlock-status", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const unlocked = await isUserUnlocked(userId);
    const fee = await getUnlockFee();

    // Latest pending payment
    const [pending] = await db
      .select()
      .from(taskUnlockPaymentsTable)
      .where(and(eq(taskUnlockPaymentsTable.userId, userId), eq(taskUnlockPaymentsTable.status, "pending")))
      .orderBy(desc(taskUnlockPaymentsTable.createdAt))
      .limit(1);

    res.json({ unlocked, unlockFeeUsd: fee, pendingPayment: pending || null });
  } catch (err) {
    console.error("unlock-status error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /tasks/unlock — create Plisio invoice to unlock task access
router.post("/unlock", authenticate, async (req, res) => {
  try {
    if (!plisio.isConfigured()) {
      res.status(503).json({ error: "Service Unavailable", message: "Payment gateway not configured. Set PLISIO_API_KEY." });
      return;
    }

    const userId = (req as any).user.id;
    const { currency } = req.body;

    if (!["USDTBSC", "BNB"].includes(currency)) {
      res.status(400).json({ error: "Bad Request", message: "Currency must be USDTBSC or BNB" });
      return;
    }

    // Already unlocked?
    if (await isUserUnlocked(userId)) {
      res.status(400).json({ error: "Bad Request", message: "Your account already has task access." });
      return;
    }

    const fee = await getUnlockFee();
    const orderId = `unlock_${userId}_${Date.now()}`;
    const baseUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN || "localhost"}`;

    const invoice = await plisio.createInvoice({
      currency: currency as "USDTBSC" | "BNB",
      amountUsd: fee,
      orderId,
      orderName: "Task Access Unlock",
      callbackUrl: `${baseUrl}/api/tasks/webhook`,
      successUrl: `${baseUrl}/tasks`,
      failUrl: `${baseUrl}/tasks`,
    });

    const [payment] = await db.insert(taskUnlockPaymentsTable).values({
      userId,
      amountUsd: String(fee),
      currency,
      plisioTxnId: invoice.txn_id,
      payAddress: invoice.wallet,
      invoiceUrl: invoice.invoice_url,
      status: "pending",
    }).returning();

    res.json({
      paymentId: payment.id,
      txnId: invoice.txn_id,
      invoiceUrl: invoice.invoice_url,
      payAddress: invoice.wallet,
      amount: invoice.amount,
      currency,
      amountUsd: fee,
    });
  } catch (err: any) {
    console.error("unlock error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

// GET /tasks/unlock-payment/:txnId — poll unlock payment status
router.get("/unlock-payment/:txnId", authenticate, async (req, res) => {
  try {
    const { txnId } = req.params;
    const userId = (req as any).user.id;

    const [payment] = await db
      .select()
      .from(taskUnlockPaymentsTable)
      .where(and(eq(taskUnlockPaymentsTable.plisioTxnId, txnId), eq(taskUnlockPaymentsTable.userId, userId)))
      .limit(1);

    if (!payment) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    // Try syncing from Plisio if still pending
    if (payment.status === "pending" && plisio.isConfigured()) {
      try {
        const txn = await plisio.getTransaction(txnId);
        const newStatus = plisio.mapStatus(txn.status);
        if (newStatus === "finished") {
          await db.update(taskUnlockPaymentsTable)
            .set({ status: "completed", updatedAt: new Date() })
            .where(eq(taskUnlockPaymentsTable.id, payment.id));
          res.json({ status: "completed" });
          return;
        } else if (["failed", "expired"].includes(newStatus)) {
          await db.update(taskUnlockPaymentsTable)
            .set({ status: newStatus as any, updatedAt: new Date() })
            .where(eq(taskUnlockPaymentsTable.id, payment.id));
        }
      } catch { /* ignore polling errors */ }
    }

    res.json({ status: payment.status, invoiceUrl: payment.invoiceUrl });
  } catch (err) {
    console.error("unlock-payment poll error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /tasks/webhook — Plisio IPN callback for unlock payments
router.post("/webhook", async (req, res) => {
  try {
    const data = req.body as Record<string, string>;

    if (!plisio.verifyWebhook(data)) {
      console.warn("[Tasks webhook] Invalid verify_hash");
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    const { txn_id, order_number, status } = data;
    if (!txn_id || !order_number?.startsWith("unlock_")) {
      res.status(200).json({ ok: true }); // not for us
      return;
    }

    const mapped = plisio.mapStatus(status);

    if (mapped === "finished") {
      await db.update(taskUnlockPaymentsTable)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(taskUnlockPaymentsTable.plisioTxnId, txn_id));
    } else if (["failed", "expired"].includes(mapped)) {
      await db.update(taskUnlockPaymentsTable)
        .set({ status: mapped as any, updatedAt: new Date() })
        .where(eq(taskUnlockPaymentsTable.plisioTxnId, txn_id));
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[Tasks webhook] Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── Tasks List ───────────────────────────────────────────────────────────────

// GET /tasks — list active tasks (unlocked users only)
router.get("/", optionalAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    const tasks = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.status, "active"))
      .orderBy(desc(tasksTable.createdAt));

    // If user logged in: enrich with their submission status
    let mySubmissions: Record<number, any> = {};
    if (userId) {
      const submissions = await db
        .select()
        .from(taskCompletionsTable)
        .where(eq(taskCompletionsTable.userId, userId));
      submissions.forEach(s => { mySubmissions[s.taskId] = s; });
    }

    res.json({
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        instructions: t.instructions,
        rewardUsd: t.rewardUsd,
        maxCompletions: t.maxCompletions,
        completionsCount: t.completionsCount,
        status: t.status,
        createdAt: t.createdAt,
        mySubmission: mySubmissions[t.id] || null,
        spotsLeft: t.maxCompletions - t.completionsCount,
      })),
    });
  } catch (err) {
    console.error("tasks list error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /tasks/:id/submit — submit task completion
router.post("/:id/submit", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const taskId = parseInt(req.params.id);
    const { proofText, proofUrl } = req.body;

    // Must be unlocked
    if (!(await isUserUnlocked(userId))) {
      res.status(403).json({ error: "Forbidden", message: "You must unlock task access first." });
      return;
    }

    if (!proofText && !proofUrl) {
      res.status(400).json({ error: "Bad Request", message: "Proof text or URL required." });
      return;
    }

    // Task exists and active?
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId)).limit(1);
    if (!task || task.status !== "active") {
      res.status(404).json({ error: "Not Found", message: "Task not found or not active." });
      return;
    }

    // Max completions reached?
    if (task.completionsCount >= task.maxCompletions) {
      res.status(400).json({ error: "Bad Request", message: "This task has reached its maximum completions." });
      return;
    }

    // Already submitted?
    const [existing] = await db
      .select({ id: taskCompletionsTable.id })
      .from(taskCompletionsTable)
      .where(and(eq(taskCompletionsTable.taskId, taskId), eq(taskCompletionsTable.userId, userId)))
      .limit(1);

    if (existing) {
      res.status(400).json({ error: "Bad Request", message: "You have already submitted this task." });
      return;
    }

    const [completion] = await db.insert(taskCompletionsTable).values({
      taskId,
      userId,
      proofText: proofText || null,
      proofUrl: proofUrl || null,
      status: "submitted",
    }).returning();

    res.status(201).json({ message: "Submission received! Admin will review it shortly.", completion });
  } catch (err) {
    console.error("submit task error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /tasks/my-submissions — user's own submissions with task info
router.get("/my-submissions", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const submissions = await db
      .select({
        id: taskCompletionsTable.id,
        taskId: taskCompletionsTable.taskId,
        status: taskCompletionsTable.status,
        rewardPaid: taskCompletionsTable.rewardPaid,
        proofText: taskCompletionsTable.proofText,
        proofUrl: taskCompletionsTable.proofUrl,
        rejectReason: taskCompletionsTable.rejectReason,
        createdAt: taskCompletionsTable.createdAt,
        updatedAt: taskCompletionsTable.updatedAt,
      })
      .from(taskCompletionsTable)
      .where(eq(taskCompletionsTable.userId, userId))
      .orderBy(desc(taskCompletionsTable.createdAt));

    const taskIds = [...new Set(submissions.map(s => s.taskId))];
    const tasks = taskIds.length
      ? await db.select({ id: tasksTable.id, title: tasksTable.title, rewardUsd: tasksTable.rewardUsd })
          .from(tasksTable).where(inArray(tasksTable.id, taskIds))
      : [];
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    const totalEarned = submissions
      .filter(s => s.status === "approved")
      .reduce((sum, s) => sum + parseFloat(String(taskMap.get(s.taskId)?.rewardUsd ?? "0")), 0);

    res.json({
      submissions: submissions.map(s => ({
        ...s,
        task: taskMap.get(s.taskId) || null,
      })),
      totalEarned,
    });
  } catch (err) {
    console.error("my-submissions error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
