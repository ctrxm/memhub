import { Router } from "express";
import { db, usersTable, postsTable, commentsTable, tagsTable, postTagsTable, siteSettingsTable, notificationsTable } from "@workspace/db";
import { desc, eq, ilike, sql, or } from "drizzle-orm";
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
    });
  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /admin/settings
router.put("/settings", async (req, res) => {
  try {
    const { siteName, siteDescription, allowRegistration, requireApproval, maxUploadSizeMb, allowedFileTypes, huggingFaceRepo, maintenanceMode } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (siteName !== undefined) updates.siteName = siteName;
    if (siteDescription !== undefined) updates.siteDescription = siteDescription;
    if (allowRegistration !== undefined) updates.allowRegistration = allowRegistration;
    if (requireApproval !== undefined) updates.requireApproval = requireApproval;
    if (maxUploadSizeMb !== undefined) updates.maxUploadSizeMb = maxUploadSizeMb;
    if (allowedFileTypes !== undefined) updates.allowedFileTypes = Array.isArray(allowedFileTypes) ? allowedFileTypes.join(",") : allowedFileTypes;
    if (huggingFaceRepo !== undefined) updates.huggingFaceRepo = huggingFaceRepo;
    if (maintenanceMode !== undefined) updates.maintenanceMode = maintenanceMode;

    let [settings] = await db.select({ id: siteSettingsTable.id }).from(siteSettingsTable).limit(1);
    
    if (!settings) {
      [settings] = await db.insert(siteSettingsTable).values(updates).returning();
    } else {
      await db.update(siteSettingsTable).set(updates).where(eq(siteSettingsTable.id, settings.id));
    }

    const [updated] = await db.select().from(siteSettingsTable).limit(1);
    res.json({
      siteName: updated.siteName,
      siteDescription: updated.siteDescription,
      allowRegistration: updated.allowRegistration,
      requireApproval: updated.requireApproval,
      maxUploadSizeMb: updated.maxUploadSizeMb,
      allowedFileTypes: updated.allowedFileTypes.split(","),
      huggingFaceRepo: updated.huggingFaceRepo,
      maintenanceMode: updated.maintenanceMode,
    });
  } catch (err) {
    console.error("Update settings error:", err);
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
