import { Router } from "express";
import { db, usersTable, tipApplicationsTable, tipsTable, userBadgesTable, badgesTable, followsTable, postsTable } from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { authenticate, optionalAuth } from "../lib/auth.js";
import * as np from "../lib/nowpayments.js";

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
    .select({ isVerified: badgesTable.isVerified })
    .from(userBadgesTable)
    .innerJoin(badgesTable, eq(userBadgesTable.badgeId, badgesTable.id))
    .where(eq(userBadgesTable.userId, userId));
  return rows.some(r => r.isVerified);
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

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /tips/eligibility — check if current user can apply
router.get("/eligibility", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const result = await checkEligibility(userId);

    // Check if already applied
    const [existing] = await db.select()
      .from(tipApplicationsTable)
      .where(eq(tipApplicationsTable.userId, userId))
      .orderBy(desc(tipApplicationsTable.createdAt))
      .limit(1);

    res.json({
      ...result,
      minFollowers: MIN_FOLLOWERS,
      application: existing || null,
      tipsEnabled: (req as any).user.tipsEnabled,
    });
  } catch (err) {
    console.error("Eligibility error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /tips/apply — submit tip application
router.post("/apply", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    // Already enabled?
    if ((req as any).user.tipsEnabled) {
      res.status(400).json({ error: "Bad Request", message: "Tips are already enabled for your account." });
      return;
    }

    // Existing pending?
    const [pending] = await db.select({ status: tipApplicationsTable.status })
      .from(tipApplicationsTable)
      .where(and(eq(tipApplicationsTable.userId, userId), eq(tipApplicationsTable.status, "pending")))
      .limit(1);

    if (pending) {
      res.status(400).json({ error: "Bad Request", message: "You already have a pending application." });
      return;
    }

    // Check eligibility
    const { eligible, followers, hasCreatorBadge, notBanned } = await checkEligibility(userId);

    if (!eligible) {
      res.status(403).json({
        error: "Not Eligible",
        message: "You do not meet all requirements to apply for tip feature.",
        followers,
        hasCreatorBadge,
        notBanned,
        minFollowers: MIN_FOLLOWERS,
      });
      return;
    }

    const [app] = await db.insert(tipApplicationsTable).values({ userId }).returning();

    res.status(201).json({
      message: "Application submitted. You'll be notified once reviewed.",
      application: app,
    });
  } catch (err) {
    console.error("Apply error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /tips/my-application — get own application status
router.get("/my-application", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const [app] = await db.select()
      .from(tipApplicationsTable)
      .where(eq(tipApplicationsTable.userId, userId))
      .orderBy(desc(tipApplicationsTable.createdAt))
      .limit(1);

    res.json({ application: app || null, tipsEnabled: (req as any).user.tipsEnabled });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /tips/currencies — get available currencies from NOWPayments
router.get("/currencies", async (_req, res) => {
  try {
    if (!np.isConfigured()) {
      res.json({ currencies: ["btc", "eth", "usdt", "usdc", "ltc", "doge"] });
      return;
    }
    const currencies = await np.getAvailableCurrencies();
    // Return top popular ones first
    const popular = ["btc", "eth", "usdt", "usdc", "ltc", "bnb", "sol", "doge", "trx"];
    const sorted = [
      ...popular.filter(c => currencies.includes(c)),
      ...currencies.filter(c => !popular.includes(c)).slice(0, 20),
    ];
    res.json({ currencies: sorted });
  } catch (err) {
    console.error("Currencies error:", err);
    res.json({ currencies: ["btc", "eth", "usdt", "usdc", "ltc", "doge"] });
  }
});

// POST /tips/create — create a tip payment
router.post("/create", authenticate, async (req, res) => {
  try {
    if (!np.isConfigured()) {
      res.status(503).json({ error: "Service Unavailable", message: "Payment gateway not configured. Set NOWPAYMENTS_API_KEY." });
      return;
    }

    const { toUserId, postId, amountUsd, cryptoCurrency } = req.body;
    const fromUserId = (req as any).user.id;

    if (!toUserId || !amountUsd || !cryptoCurrency) {
      res.status(400).json({ error: "Bad Request", message: "toUserId, amountUsd, and cryptoCurrency are required." });
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

    // Check recipient has tips enabled
    const [recipient] = await db.select({ tipsEnabled: usersTable.tipsEnabled, username: usersTable.username })
      .from(usersTable).where(eq(usersTable.id, parseInt(toUserId))).limit(1);

    if (!recipient?.tipsEnabled) {
      res.status(403).json({ error: "Forbidden", message: "This user has not enabled the tip feature." });
      return;
    }

    const sender = (req as any).user;
    const orderId = `tip_${Date.now()}_${fromUserId}_${toUserId}`;
    const description = `Tip from ${sender.username} to ${recipient.username}${postId ? ` for post #${postId}` : ""}`;

    const baseUrl = process.env.APP_URL || `https://${process.env.REPL_SLUG || "localhost"}`;
    const webhookUrl = `${baseUrl}/api/tips/webhook`;

    const payment = await np.createPayment({
      priceAmount: amount,
      priceCurrency: "usd",
      payCurrency: cryptoCurrency.toLowerCase(),
      orderId,
      orderDescription: description,
      ipnCallbackUrl: webhookUrl,
    });

    // Store tip record
    const [tip] = await db.insert(tipsTable).values({
      fromUserId,
      toUserId: parseInt(toUserId),
      postId: postId ? parseInt(postId) : null,
      amountUsd: String(amount),
      cryptoAmount: String(payment.pay_amount),
      cryptoCurrency: payment.pay_currency,
      nowPaymentId: payment.payment_id,
      payAddress: payment.pay_address,
      status: "waiting",
    }).returning();

    res.json({
      tipId: tip.id,
      paymentId: payment.payment_id,
      payAddress: payment.pay_address,
      payAmount: payment.pay_amount,
      payCurrency: payment.pay_currency,
      priceAmount: amount,
      priceCurrency: "USD",
      status: payment.payment_status,
      expiresAt: payment.expiration_estimate_date,
    });
  } catch (err: any) {
    console.error("Create tip error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message || "Failed to create payment." });
  }
});

// GET /tips/payment/:paymentId — poll payment status
router.get("/payment/:paymentId", authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Update from NOWPayments if configured
    if (np.isConfigured()) {
      try {
        const npPayment = await np.getPayment(paymentId);
        await db.update(tipsTable)
          .set({ status: npPayment.payment_status as any, updatedAt: new Date() })
          .where(eq(tipsTable.nowPaymentId, paymentId));
      } catch (_) {}
    }

    const [tip] = await db.select().from(tipsTable)
      .where(eq(tipsTable.nowPaymentId, paymentId)).limit(1);

    if (!tip) {
      res.status(404).json({ error: "Not Found", message: "Payment not found." });
      return;
    }

    res.json({ status: tip.status, tip });
  } catch (err) {
    console.error("Payment status error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /tips/webhook — NOWPayments IPN callback
router.post("/webhook", async (req, res) => {
  try {
    const { payment_id, payment_status } = req.body;

    if (payment_id && payment_status) {
      await db.update(tipsTable)
        .set({ status: payment_status as any, updatedAt: new Date() })
        .where(eq(tipsTable.nowPaymentId, String(payment_id)));
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /tips/wallet — my wallet (tips I received)
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
    })
      .from(tipsTable)
      .where(eq(tipsTable.toUserId, userId))
      .orderBy(desc(tipsTable.createdAt))
      .limit(50);

    const sent = await db.select({
      id: tipsTable.id,
      amountUsd: tipsTable.amountUsd,
      cryptoCurrency: tipsTable.cryptoCurrency,
      status: tipsTable.status,
      postId: tipsTable.postId,
      toUserId: tipsTable.toUserId,
      createdAt: tipsTable.createdAt,
    })
      .from(tipsTable)
      .where(and(eq(tipsTable.fromUserId, userId)))
      .orderBy(desc(tipsTable.createdAt))
      .limit(50);

    // Enrich with usernames
    const allUserIds = [
      ...new Set([
        ...received.map(t => t.fromUserId).filter(Boolean),
        ...sent.map(t => t.toUserId),
      ]),
    ] as number[];

    const users = allUserIds.length
      ? await db.select({ id: usersTable.id, username: usersTable.username, avatar: usersTable.avatar })
          .from(usersTable).where(inArray(usersTable.id, allUserIds))
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    // Enrich post titles
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
      .reduce((sum, t) => sum + parseFloat(String(t.amountUsd)), 0);

    const pendingReceived = received
      .filter(t => ["waiting", "confirming", "confirmed", "sending"].includes(t.status))
      .reduce((sum, t) => sum + parseFloat(String(t.amountUsd)), 0);

    res.json({
      tipsEnabled: (req as any).user.tipsEnabled,
      totalReceived: totalReceived.toFixed(2),
      pendingReceived: pendingReceived.toFixed(2),
      received: received.map(t => ({
        ...t,
        amountUsd: parseFloat(String(t.amountUsd)),
        from: t.fromUserId ? userMap.get(t.fromUserId) || null : null,
        post: t.postId ? postMap.get(t.postId) || null : null,
      })),
      sent: sent.map(t => ({
        ...t,
        amountUsd: parseFloat(String(t.amountUsd)),
        to: userMap.get(t.toUserId) || null,
        post: t.postId ? postMap.get(t.postId) || null : null,
      })),
    });
  } catch (err) {
    console.error("Wallet error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /tips/post/:postId/author — check if post author has tips enabled
router.get("/post/:postId/author", optionalAuth, async (req, res) => {
  try {
    const [post] = await db.select({ authorId: postsTable.authorId })
      .from(postsTable).where(eq(postsTable.id, parseInt(req.params.postId))).limit(1);
    if (!post) { res.json({ tipsEnabled: false }); return; }

    const [author] = await db.select({ tipsEnabled: usersTable.tipsEnabled, username: usersTable.username })
      .from(usersTable).where(eq(usersTable.id, post.authorId)).limit(1);

    res.json({ tipsEnabled: author?.tipsEnabled ?? false, authorId: post.authorId, username: author?.username });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// GET /tips/admin/applications — list all applications (admin only)
router.get("/admin/applications", authenticate, async (req, res) => {
  try {
    if ((req as any).user.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const apps = await db.select()
      .from(tipApplicationsTable)
      .orderBy(desc(tipApplicationsTable.createdAt))
      .limit(100);

    const userIds = [...new Set(apps.map(a => a.userId))];
    const users = userIds.length
      ? await db.select({ id: usersTable.id, username: usersTable.username, avatar: usersTable.avatar })
          .from(usersTable).where(inArray(usersTable.id, userIds))
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    // Enrich with followers + badge check
    const enriched = await Promise.all(apps.map(async app => {
      const followers = await getFollowersCount(app.userId);
      const hasCreatorBadge = await hasVerifiedBadge(app.userId);
      return {
        ...app,
        user: userMap.get(app.userId) || null,
        followers,
        hasCreatorBadge,
      };
    }));

    res.json({ applications: enriched });
  } catch (err) {
    console.error("Admin applications error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /tips/admin/applications/:id/approve
router.put("/admin/applications/:id/approve", authenticate, async (req, res) => {
  try {
    if ((req as any).user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

    const appId = parseInt(req.params.id);
    const adminId = (req as any).user.id;

    const [app] = await db.update(tipApplicationsTable)
      .set({ status: "approved", reviewedBy: adminId, reviewedAt: new Date() })
      .where(eq(tipApplicationsTable.id, appId))
      .returning();

    if (!app) { res.status(404).json({ error: "Not Found" }); return; }

    // Enable tips for user
    await db.update(usersTable)
      .set({ tipsEnabled: true })
      .where(eq(usersTable.id, app.userId));

    res.json({ message: "Application approved. Tip feature enabled for user.", application: app });
  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /tips/admin/applications/:id/reject
router.put("/admin/applications/:id/reject", authenticate, async (req, res) => {
  try {
    if ((req as any).user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

    const appId = parseInt(req.params.id);
    const adminId = (req as any).user.id;
    const { reason } = req.body;

    const [app] = await db.update(tipApplicationsTable)
      .set({ status: "rejected", reviewedBy: adminId, reviewedAt: new Date(), rejectionReason: reason || null })
      .where(eq(tipApplicationsTable.id, appId))
      .returning();

    if (!app) { res.status(404).json({ error: "Not Found" }); return; }

    res.json({ message: "Application rejected.", application: app });
  } catch (err) {
    console.error("Reject error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
