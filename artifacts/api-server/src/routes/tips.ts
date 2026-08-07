import { Router } from "express";
import { db, usersTable, tipApplicationsTable, tipsTable, userBadgesTable, badgesTable, followsTable, postsTable, withdrawalsTable } from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { authenticate, optionalAuth } from "../lib/auth.js";
import * as plisio from "../lib/plisio.js";

const router = Router();

const MIN_FOLLOWERS = 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getFollowersCount(userId: number): Promise<number> {
  const [r] = await db.select({ count: sql<number>`count(*)` })
    .from(followsTable)
    .where(eq(followsTable.followingId, userId));
  return Number(r?.count || 0);
}

async function hasVerifiedBadge(userId: number): Promise<boolean> {
  const rows = await db
    .select({ id: userBadgesTable.badgeId })
    .from(userBadgesTable)
    .where(eq(userBadgesTable.userId, userId));
  return rows.length > 0;
}

async function checkEligibility(userId: number): Promise<{
  eligible: boolean;
  followers: number;
  hasCreatorBadge: boolean;
  notBanned: boolean;
}> {
  const [user] = await db.select({ isBanned: usersTable.isBanned })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  const followers = await getFollowersCount(userId);
  const hasCreatorBadge = await hasVerifiedBadge(userId);
  const notBanned = !user?.isBanned;

  return {
    eligible: followers >= MIN_FOLLOWERS && hasCreatorBadge && notBanned,
    followers,
    hasCreatorBadge,
    notBanned,
  };
}

// ─── Tip Application Routes ───────────────────────────────────────────────────

router.get("/eligibility", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const result = await checkEligibility(userId);
    const [existing] = await db.select()
      .from(tipApplicationsTable)
      .where(eq(tipApplicationsTable.userId, userId))
      .orderBy(desc(tipApplicationsTable.createdAt))
      .limit(1);
    res.json({ ...result, minFollowers: MIN_FOLLOWERS, application: existing || null, tipsEnabled: (req as any).user.tipsEnabled });
  } catch (err) {
    console.error("Eligibility error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/apply", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    if ((req as any).user.tipsEnabled) {
      res.status(400).json({ error: "Bad Request", message: "Tips are already enabled for your account." });
      return;
    }
    const [pending] = await db.select({ status: tipApplicationsTable.status })
      .from(tipApplicationsTable)
      .where(and(eq(tipApplicationsTable.userId, userId), eq(tipApplicationsTable.status, "pending")))
      .limit(1);
    if (pending) {
      res.status(400).json({ error: "Bad Request", message: "You already have a pending application." });
      return;
    }
    const { eligible, followers, hasCreatorBadge, notBanned } = await checkEligibility(userId);
    if (!eligible) {
      res.status(403).json({ error: "Not Eligible", message: "You do not meet all requirements.", followers, hasCreatorBadge, notBanned, minFollowers: MIN_FOLLOWERS });
      return;
    }
    const [app] = await db.insert(tipApplicationsTable).values({ userId }).returning();
    res.status(201).json({ message: "Application submitted.", application: app });
  } catch (err) {
    console.error("Apply error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/my-application", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const [app] = await db.select().from(tipApplicationsTable)
      .where(eq(tipApplicationsTable.userId, userId))
      .orderBy(desc(tipApplicationsTable.createdAt)).limit(1);
    res.json({ application: app || null, tipsEnabled: (req as any).user.tipsEnabled });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /tips/currencies — only USDT BEP20 and BNB via Plisio
router.get("/currencies", async (_req, res) => {
  res.json({ currencies: plisio.SUPPORTED_CURRENCIES });
});

// POST /tips/create — create a tip payment via Plisio
router.post("/create", authenticate, async (req, res) => {
  try {
    if (!plisio.isConfigured()) {
      res.status(503).json({ error: "Service Unavailable", message: "Payment gateway not configured. Set PLISIO_API_KEY." });
      return;
    }

    const { toUserId, postId, amountUsd, cryptoCurrency } = req.body;
    const fromUserId = (req as any).user.id;

    if (!toUserId || !amountUsd || !cryptoCurrency) {
      res.status(400).json({ error: "Bad Request", message: "toUserId, amountUsd, and cryptoCurrency are required." });
      return;
    }
    if (!["USDTBSC", "BNB"].includes(cryptoCurrency)) {
      res.status(400).json({ error: "Bad Request", message: "Only USDTBSC and BNB are supported." });
      return;
    }
    if (String(fromUserId) === String(toUserId)) {
      res.status(400).json({ error: "Bad Request", message: "You cannot tip yourself." });
      return;
    }

    const amount = parseFloat(amountUsd);
    if (isNaN(amount) || amount < 1) {
      res.status(400).json({ error: "Bad Request", message: "Minimum tip amount is $1 USD." });
      return;
    }

    const [recipient] = await db.select({ tipsEnabled: usersTable.tipsEnabled, username: usersTable.username })
      .from(usersTable).where(eq(usersTable.id, parseInt(toUserId))).limit(1);
    if (!recipient?.tipsEnabled) {
      res.status(403).json({ error: "Forbidden", message: "This user has not enabled the tip feature." });
      return;
    }

    const sender = (req as any).user;
    const orderId = `tip_${Date.now()}_${fromUserId}_${toUserId}`;
    const description = `Tip from ${sender.username} to ${recipient.username}${postId ? ` for post #${postId}` : ""}`;
    const baseUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN || "localhost"}`;

    const invoice = await plisio.createInvoice({
      currency: cryptoCurrency as "USDTBSC" | "BNB",
      amountUsd: amount,
      orderId,
      orderName: description,
      callbackUrl: `${baseUrl}/api/tips/webhook`,
      successUrl: `${baseUrl}/wallet`,
      failUrl: `${baseUrl}/wallet`,
    });

    const [tip] = await db.insert(tipsTable).values({
      fromUserId,
      toUserId: parseInt(toUserId),
      postId: postId ? parseInt(postId) : null,
      amountUsd: String(amount),
      cryptoAmount: String(invoice.invoice_total_sum || ""),
      cryptoCurrency: invoice.currency || cryptoCurrency,
      nowPaymentId: invoice.txn_id,   // reusing column for Plisio txn_id
      payAddress: null,
      status: "waiting",
    }).returning();

    res.json({
      tipId: tip.id,
      paymentId: invoice.txn_id,
      invoiceUrl: invoice.invoice_url,
      payAmount: invoice.invoice_total_sum,
      payCurrency: invoice.currency || cryptoCurrency,
      priceAmount: amount,
      priceCurrency: "USD",
      status: "waiting",
      expiresAt: invoice.expire_utc,
    });
  } catch (err: any) {
    console.error("Create tip error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message || "Failed to create payment." });
  }
});

// GET /tips/payment/:txnId — poll tip payment status
router.get("/payment/:txnId", authenticate, async (req, res) => {
  try {
    const { txnId } = req.params;

    if (plisio.isConfigured()) {
      try {
        const txn = await plisio.getTransaction(txnId);
        const mapped = plisio.mapStatus(txn.status);
        if (mapped !== "waiting") {
          await db.update(tipsTable)
            .set({ status: mapped as any, updatedAt: new Date() })
            .where(eq(tipsTable.nowPaymentId, txnId));
        }
      } catch { /* ignore */ }
    }

    const [tip] = await db.select().from(tipsTable)
      .where(eq(tipsTable.nowPaymentId, txnId)).limit(1);
    if (!tip) { res.status(404).json({ error: "Not Found" }); return; }

    res.json({ status: tip.status, tip });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /tips/webhook — Plisio IPN callback for tips
router.post("/webhook", async (req, res) => {
  try {
    const data = req.body as Record<string, string>;

    if (!plisio.verifyWebhook(data)) {
      console.warn("[Tips webhook] Invalid verify_hash");
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    const { txn_id, order_number, status } = data;
    if (!txn_id || !order_number?.startsWith("tip_")) {
      res.status(200).json({ ok: true });
      return;
    }

    const mapped = plisio.mapStatus(status);
    await db.update(tipsTable)
      .set({ status: mapped as any, updatedAt: new Date() })
      .where(eq(tipsTable.nowPaymentId, txn_id));

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[Tips webhook] Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /tips/wallet
router.get("/wallet", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const received = await db.select({
      id: tipsTable.id,
      amountUsd: tipsTable.amountUsd,
      cryptoAmount: tipsTable.cryptoAmount,
      cryptoCurrency: tipsTable.cryptoCurrency,
      status: tipsTable.status,
      postId: tipsTable.postId,
      fromUserId: tipsTable.fromUserId,
      createdAt: tipsTable.createdAt,
    }).from(tipsTable).where(eq(tipsTable.toUserId, userId)).orderBy(desc(tipsTable.createdAt)).limit(50);

    const sent = await db.select({
      id: tipsTable.id,
      amountUsd: tipsTable.amountUsd,
      cryptoCurrency: tipsTable.cryptoCurrency,
      status: tipsTable.status,
      postId: tipsTable.postId,
      toUserId: tipsTable.toUserId,
      createdAt: tipsTable.createdAt,
    }).from(tipsTable).where(eq(tipsTable.fromUserId, userId)).orderBy(desc(tipsTable.createdAt)).limit(50);

    const allUserIds = [...new Set([
      ...received.map(t => t.fromUserId).filter(Boolean),
      ...sent.map(t => t.toUserId),
    ])] as number[];

    const users = allUserIds.length
      ? await db.select({ id: usersTable.id, username: usersTable.username, avatar: usersTable.avatar })
          .from(usersTable).where(inArray(usersTable.id, allUserIds))
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const allPostIds = [...new Set([
      ...received.map(t => t.postId),
      ...sent.map(t => t.postId),
    ].filter(Boolean))] as number[];

    const posts = allPostIds.length
      ? await db.select({ id: postsTable.id, title: postsTable.title })
          .from(postsTable).where(inArray(postsTable.id, allPostIds))
      : [];
    const postMap = new Map(posts.map(p => [p.id, p]));

    const totalReceived = received
      .filter(t => t.status === "finished")
      .reduce((s, t) => s + parseFloat(String(t.amountUsd)), 0);

    const pendingReceived = received
      .filter(t => ["waiting", "confirming", "confirmed", "sending"].includes(t.status))
      .reduce((s, t) => s + parseFloat(String(t.amountUsd)), 0);

    res.json({
      tipsEnabled: (req as any).user.tipsEnabled,
      totalReceived: totalReceived.toFixed(2),
      pendingReceived: pendingReceived.toFixed(2),
      received: received.map(t => ({ ...t, from: t.fromUserId ? userMap.get(t.fromUserId) : null, post: t.postId ? postMap.get(t.postId) : null })),
      sent: sent.map(t => ({ ...t, to: userMap.get(t.toUserId), post: t.postId ? postMap.get(t.postId) : null })),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /tips/withdraw/request
router.post("/withdraw/request", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { address, currency, amountUsd } = req.body;
    if (!address || !currency || !amountUsd) {
      res.status(400).json({ error: "Bad Request", message: "address, currency, amountUsd required." });
      return;
    }
    if (!["USDTBSC", "BNB"].includes(currency)) {
      res.status(400).json({ error: "Bad Request", message: "Only USDTBSC and BNB withdrawals are supported." });
      return;
    }
    const [w] = await db.insert(withdrawalsTable).values({
      userId,
      address,
      currency,
      amountUsd: String(parseFloat(amountUsd)),
      status: "pending",
    }).returning();
    res.status(201).json({ message: "Withdrawal request submitted.", withdrawal: w });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /tips/withdraw/history
router.get("/withdraw/history", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const withdrawalsList = await db.select().from(withdrawalsTable)
      .where(eq(withdrawalsTable.userId, userId))
      .orderBy(desc(withdrawalsTable.createdAt)).limit(50);
    res.json({ withdrawals: withdrawalsList });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── Admin routes ─────────────────────────────────────────────────────────────

router.get("/admin/applications", authenticate, async (req, res) => {
  try {
    if ((req as any).user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
    const apps = await db.select().from(tipApplicationsTable).orderBy(desc(tipApplicationsTable.createdAt));
    const userIds = apps.map(a => a.userId);
    const users = userIds.length ? await db.select({ id: usersTable.id, username: usersTable.username, avatar: usersTable.avatar })
      .from(usersTable).where(inArray(usersTable.id, userIds)) : [];
    const followCounts = await Promise.all(userIds.map(uid => getFollowersCount(uid).then(count => ({ uid, count }))));
    const followMap = new Map(followCounts.map(f => [f.uid, f.count]));
    const userMap = new Map(users.map(u => [u.id, u]));
    res.json({ applications: apps.map(a => ({ ...a, user: userMap.get(a.userId) || null, followers: followMap.get(a.userId) || 0, hasCreatorBadge: false })) });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/admin/applications/:id/approve", authenticate, async (req, res) => {
  try {
    if ((req as any).user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
    const appId = parseInt(req.params.id);
    const adminId = (req as any).user.id;
    const [app] = await db.update(tipApplicationsTable)
      .set({ status: "approved", reviewedBy: adminId, reviewedAt: new Date() })
      .where(eq(tipApplicationsTable.id, appId)).returning();
    if (!app) { res.status(404).json({ error: "Not Found" }); return; }
    await db.update(usersTable).set({ tipsEnabled: true }).where(eq(usersTable.id, app.userId));
    res.json({ message: "Approved.", application: app });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/admin/applications/:id/reject", authenticate, async (req, res) => {
  try {
    if ((req as any).user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
    const appId = parseInt(req.params.id);
    const adminId = (req as any).user.id;
    const { reason } = req.body;
    const [app] = await db.update(tipApplicationsTable)
      .set({ status: "rejected", reviewedBy: adminId, reviewedAt: new Date(), rejectionReason: reason || null })
      .where(eq(tipApplicationsTable.id, appId)).returning();
    if (!app) { res.status(404).json({ error: "Not Found" }); return; }
    res.json({ message: "Rejected.", application: app });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
