import { Router } from "express";
import { db, usersTable, postsTable, commentsTable, tagsTable, postTagsTable, siteSettingsTable, notificationsTable, tasksTable, taskCompletionsTable, withdrawalsTable } from "@workspace/db";
import { desc, eq, ilike, sql, or, inArray } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";

const router = Router();

// All admin routes require admin/moderator role
router.use(requireAdmin);

// GET /admin/stats
router.get("/stats", async (_req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
    const [totalPosts] = await db.select({ count: sql<number>`count(*)` }).from(postsTable);
    const [totalComments] = await db.select({ count: sql<number>`count(*)` }).from(commentsTable);
    const [totalVotes] = await db.select({ count: sql<number>`count(*)` }).from(usersTable); // approx

    const [newUsersToday] = await db.select({ count: sql<number>`count(*)` })
      .from(usersTable).where(sql`created_at >= ${today}`);
    const [newPostsToday] = await db.select({ count: sql<number>`count(*)` })
      .from(postsTable).where(sql`created_at >= ${today}`);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const [activeUsers] = await db.select({ count: sql<number>`count(*)` })
      .from(usersTable).where(sql`last_active_at >= ${weekAgo}`);

    const [pendingPosts] = await db.select({ count: sql<number>`count(*)` })
      .from(postsTable).where(eq(postsTable.status, "pending"));

    res.json({
      totalUsers: Number(totalUsers?.count || 0),
      totalPosts: Number(totalPosts?.count || 0),
      totalComments: Number(totalComments?.count || 0),
      totalVotes: Number(totalVotes?.count || 0),
      newUsersToday: Number(newUsersToday?.count || 0),
      newPostsToday: Number(newPostsToday?.count || 0),
      activeUsersThisWeek: Number(activeUsers?.count || 0),
      pendingPosts: Number(pendingPosts?.count || 0),
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /admin/users
router.get("/users", async (req, res) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || "1"));
    const search = (req.query.search as string) || "";
    const limit = 20;
    const offset = (page - 1) * limit;

    let whereClause = search
      ? or(ilike(usersTable.username, `%${search}%`), ilike(usersTable.email, `%${search}%`))
      : undefined;

    const users = await db.select().from(usersTable)
      .where(whereClause)
      .orderBy(desc(usersTable.createdAt))
      .limit(limit).offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(usersTable).where(whereClause);
    const total = Number(countResult?.count || 0);

    const formatted = users.map(u => ({
      id: String(u.id),
      username: u.username,
      email: u.email,
      avatar: u.avatar || null,
      role: u.role,
      isBanned: u.isBanned,
      postsCount: 0,
      commentsCount: 0,
      totalPoints: u.totalPoints,
      createdAt: u.createdAt,
      lastActiveAt: u.lastActiveAt || null,
    }));

    res.json({ users: formatted, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /admin/users/:id/ban
router.post("/users/:id/ban", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { isBanned, reason } = req.body;

    await db.update(usersTable)
      .set({ isBanned, banReason: reason || null })
      .where(eq(usersTable.id, userId));

    res.json({ success: true, message: `User ${isBanned ? "banned" : "unbanned"}` });
  } catch (err) {
    console.error("Ban user error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /admin/users/:id/role
router.put("/users/:id/role", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!["user", "moderator", "admin"].includes(role)) {
      res.status(400).json({ error: "Bad Request", message: "Invalid role" });
      return;
    }

    await db.update(usersTable).set({ role }).where(eq(usersTable.id, userId));
    res.json({ success: true, message: "Role updated" });
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /admin/posts
router.get("/posts", async (req, res) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || "1"));
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "all";
    const limit = 20;
    const offset = (page - 1) * limit;

    let whereClause: any = undefined;
    const conditions: any[] = [];
    
    if (status !== "all") {
      conditions.push(eq(postsTable.status, status as any));
    }
    if (search) {
      conditions.push(ilike(postsTable.title, `%${search}%`));
    }

    if (conditions.length === 1) {
      whereClause = conditions[0];
    } else if (conditions.length > 1) {
      const { and } = await import("drizzle-orm");
      whereClause = and(...conditions);
    }

    const posts = await db.select().from(postsTable)
      .where(whereClause)
      .orderBy(desc(postsTable.createdAt))
      .limit(limit).offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(postsTable).where(whereClause);
    const total = Number(countResult?.count || 0);

    const authorIds = [...new Set(posts.map(p => p.authorId))];
    const { inArray } = await import("drizzle-orm");
    const authors = authorIds.length ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds)) : [];
    const authorMap = new Map(authors.map(a => [a.id, a]));

    const formatted = posts.map(p => ({
      id: String(p.id),
      title: p.title,
      imageUrl: p.imageUrl,
      gifUrl: p.gifUrl || null,
      type: p.type,
      upvotes: p.upvotes,
      downvotes: p.downvotes,
      points: p.points,
      commentsCount: p.commentsCount,
      viewsCount: p.viewsCount,
      status: p.status,
      userVote: null,
      isSaved: false,
      tags: [],
      author: {
        id: String(p.authorId),
        username: authorMap.get(p.authorId)?.username || "unknown",
        avatar: authorMap.get(p.authorId)?.avatar || null,
      },
      createdAt: p.createdAt,
    }));

    res.json({ posts: formatted, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Admin posts error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /admin/posts/:id/status
router.put("/posts/:id/status", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { status } = req.body;

    if (!["pending", "approved", "removed"].includes(status)) {
      res.status(400).json({ error: "Bad Request" });
      return;
    }

    await db.update(postsTable).set({ status }).where(eq(postsTable.id, postId));
    res.json({ success: true, message: "Status updated" });
  } catch (err) {
    console.error("Update post status error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /admin/comments
router.get("/comments", async (req, res) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || "1"));
    const limit = 20;
    const offset = (page - 1) * limit;

    const { commentsTable, usersTable } = await import("@workspace/db");
    const { inArray } = await import("drizzle-orm");
    
    const comments = await db.select().from(commentsTable)
      .orderBy(desc(commentsTable.createdAt))
      .limit(limit).offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(commentsTable);
    const total = Number(countResult?.count || 0);

    const authorIds = [...new Set(comments.map(c => c.authorId))];
    const authors = authorIds.length ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds)) : [];
    const authorMap = new Map(authors.map(a => [a.id, a]));

    const formatted = comments.map(c => ({
      id: String(c.id),
      content: c.content,
      upvotes: c.upvotes,
      downvotes: c.downvotes,
      userVote: null,
      author: {
        id: String(c.authorId),
        username: authorMap.get(c.authorId)?.username || "unknown",
        avatar: authorMap.get(c.authorId)?.avatar || null,
      },
      parentId: c.parentId ? String(c.parentId) : null,
      replies: [],
      createdAt: c.createdAt,
    }));

    res.json({ comments: formatted, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Admin comments error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /admin/settings
router.get("/settings", async (_req, res) => {
  try {
    let [settings] = await db.select().from(siteSettingsTable).limit(1);
    
    if (!settings) {
      [settings] = await db.insert(siteSettingsTable).values({}).returning();
    }

    res.json({
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      allowRegistration: settings.allowRegistration,
      requireApproval: settings.requireApproval,
      maxUploadSizeMb: settings.maxUploadSizeMb,
      allowedFileTypes: settings.allowedFileTypes.split(","),
      huggingFaceRepo: settings.huggingFaceRepo,
      maintenanceMode: settings.maintenanceMode,
      smtpEnabled: settings.smtpEnabled,
      taskEnabled: settings.taskEnabled ?? false,
      taskUnlockFee: settings.taskUnlockFee ?? "0.50",
    });
  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /admin/settings
router.put("/settings", async (req, res) => {
  try {
    const { siteName, siteDescription, allowRegistration, requireApproval, maxUploadSizeMb, allowedFileTypes, huggingFaceRepo, maintenanceMode, smtpEnabled, taskEnabled, taskUnlockFee } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (siteName !== undefined) updates.siteName = siteName;
    if (siteDescription !== undefined) updates.siteDescription = siteDescription;
    if (allowRegistration !== undefined) updates.allowRegistration = allowRegistration;
    if (requireApproval !== undefined) updates.requireApproval = requireApproval;
    if (maxUploadSizeMb !== undefined) updates.maxUploadSizeMb = maxUploadSizeMb;
    if (allowedFileTypes !== undefined) updates.allowedFileTypes = Array.isArray(allowedFileTypes) ? allowedFileTypes.join(",") : allowedFileTypes;
    if (huggingFaceRepo !== undefined) updates.huggingFaceRepo = huggingFaceRepo;
    if (maintenanceMode !== undefined) updates.maintenanceMode = maintenanceMode;
    if (smtpEnabled !== undefined) updates.smtpEnabled = smtpEnabled;
    if (taskEnabled !== undefined) updates.taskEnabled = taskEnabled;
    if (taskUnlockFee !== undefined) updates.taskUnlockFee = String(parseFloat(taskUnlockFee) || 0.5);

    let [settings] = await db.select({ id: siteSettingsTable.id }).from(siteSettingsTable).limit(1);
    
    if (!settings) {
      [settings] = await db.insert(siteSettingsTable).values(updates).returning();
    } else {
      await db.update(siteSettingsTable).set(updates).where(eq(siteSettingsTable.id, settings.id));
    }

    const [updated] = await db.select().from(siteSettingsTable).limit(1);

    // Bust the maintenance mode cache
    const { invalidateMaintenanceCache } = await import("../lib/maintenance-cache.js");
    invalidateMaintenanceCache();

    res.json({
      siteName: updated.siteName,
      siteDescription: updated.siteDescription,
      allowRegistration: updated.allowRegistration,
      requireApproval: updated.requireApproval,
      maxUploadSizeMb: updated.maxUploadSizeMb,
      allowedFileTypes: updated.allowedFileTypes.split(","),
      huggingFaceRepo: updated.huggingFaceRepo,
      maintenanceMode: updated.maintenanceMode,
      smtpEnabled: updated.smtpEnabled,
      taskEnabled: updated.taskEnabled ?? false,
      taskUnlockFee: updated.taskUnlockFee ?? "0.50",
    });
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── Task Management ──────────────────────────────────────────────────────────

// GET /admin/tasks
router.get("/tasks", async (_req, res) => {
  try {
    const tasks = await db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt));
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /admin/tasks
router.post("/tasks", async (req, res) => {
  try {
    const { title, description, instructions, rewardUsd, maxCompletions } = req.body;
    if (!title || !description || !instructions || !rewardUsd) {
      res.status(400).json({ error: "Bad Request", message: "title, description, instructions, rewardUsd required." });
      return;
    }
    const [task] = await db.insert(tasksTable).values({
      title, description, instructions,
      rewardUsd: String(parseFloat(rewardUsd)),
      maxCompletions: parseInt(maxCompletions) || 100,
      status: "active",
    }).returning();
    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /admin/tasks/:id
router.put("/tasks/:id", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { title, description, instructions, rewardUsd, maxCompletions, status } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (instructions !== undefined) updates.instructions = instructions;
    if (rewardUsd !== undefined) updates.rewardUsd = String(parseFloat(rewardUsd));
    if (maxCompletions !== undefined) updates.maxCompletions = parseInt(maxCompletions);
    if (status !== undefined) updates.status = status;
    const [task] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, taskId)).returning();
    if (!task) { res.status(404).json({ error: "Not Found" }); return; }
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /admin/tasks/:id
router.delete("/tasks/:id", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    await db.delete(taskCompletionsTable).where(eq(taskCompletionsTable.taskId, taskId));
    await db.delete(tasksTable).where(eq(tasksTable.id, taskId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /admin/task-completions — pending submissions
router.get("/task-completions", async (req, res) => {
  try {
    const { status = "submitted" } = req.query as any;
    const completions = status === "all"
      ? await db.select().from(taskCompletionsTable).orderBy(desc(taskCompletionsTable.createdAt)).limit(100)
      : await db.select().from(taskCompletionsTable).where(eq(taskCompletionsTable.status, status)).orderBy(desc(taskCompletionsTable.createdAt)).limit(100);

    const taskIds = [...new Set(completions.map(c => c.taskId))];
    const userIds = [...new Set(completions.map(c => c.userId))];

    const [tasks, users] = await Promise.all([
      taskIds.length ? db.select({ id: tasksTable.id, title: tasksTable.title, rewardUsd: tasksTable.rewardUsd })
        .from(tasksTable).where(inArray(tasksTable.id, taskIds)) : [],
      userIds.length ? db.select({ id: usersTable.id, username: usersTable.username, avatar: usersTable.avatar })
        .from(usersTable).where(inArray(usersTable.id, userIds)) : [],
    ]);

    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const userMap = new Map(users.map(u => [u.id, u]));

    res.json({
      completions: completions.map(c => ({
        ...c,
        task: taskMap.get(c.taskId) || null,
        user: userMap.get(c.userId) || null,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /admin/task-completions/:id/approve
router.put("/task-completions/:id/approve", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [completion] = await db.update(taskCompletionsTable)
      .set({ status: "approved", rewardPaid: true, updatedAt: new Date() })
      .where(eq(taskCompletionsTable.id, id)).returning();
    if (!completion) { res.status(404).json({ error: "Not Found" }); return; }
    // Increment completions count on task
    await db.update(tasksTable)
      .set({ completionsCount: sql`${tasksTable.completionsCount} + 1`, updatedAt: new Date() })
      .where(eq(tasksTable.id, completion.taskId));
    res.json({ completion });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /admin/task-completions/:id/reject
router.put("/task-completions/:id/reject", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    const [completion] = await db.update(taskCompletionsTable)
      .set({ status: "rejected", rejectReason: reason || null, updatedAt: new Date() })
      .where(eq(taskCompletionsTable.id, id)).returning();
    if (!completion) { res.status(404).json({ error: "Not Found" }); return; }
    res.json({ completion });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── Withdrawal Management ────────────────────────────────────────────────────

// GET /admin/withdrawals
router.get("/withdrawals", async (req, res) => {
  try {
    const { status } = req.query as any;
    const list = status && status !== "all"
      ? await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.status, status)).orderBy(desc(withdrawalsTable.createdAt)).limit(100)
      : await db.select().from(withdrawalsTable).orderBy(desc(withdrawalsTable.createdAt)).limit(100);
    const userIds = [...new Set(list.map(w => w.userId))];
    const users = userIds.length ? await db.select({ id: usersTable.id, username: usersTable.username })
      .from(usersTable).where(inArray(usersTable.id, userIds)) : [];
    const userMap = new Map(users.map(u => [u.id, u]));
    res.json({ withdrawals: list.map(w => ({ ...w, user: userMap.get(w.userId) || null })) });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /admin/withdrawals/:id — update withdrawal status
router.put("/withdrawals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, txHash, note } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (txHash) updates.txHash = txHash;
    if (note !== undefined) updates.note = note;
    const [w] = await db.update(withdrawalsTable).set(updates).where(eq(withdrawalsTable.id, id)).returning();
    if (!w) { res.status(404).json({ error: "Not Found" }); return; }
    res.json({ withdrawal: w });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /admin/tags
router.post("/tags", async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) {
      res.status(400).json({ error: "Bad Request", message: "Name required" });
      return;
    }
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const [tag] = await db.insert(tagsTable).values({ name, slug, color: color || null }).returning();
    res.status(201).json({ id: String(tag.id), name: tag.name, slug: tag.slug, postsCount: 0, color: tag.color || null });
  } catch (err) {
    console.error("Create tag error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /admin/tags/:id
router.delete("/tags/:id", async (req, res) => {
  try {
    const tagId = parseInt(req.params.id);
    await db.delete(postTagsTable).where(eq(postTagsTable.tagId, tagId));
    await db.delete(tagsTable).where(eq(tagsTable.id, tagId));
    res.json({ success: true, message: "Tag deleted" });
  } catch (err) {
    console.error("Delete tag error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
