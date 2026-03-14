import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import postsRouter from "./posts.js";
import commentsRouter from "./comments.js";
import usersRouter from "./users.js";
import tagsRouter from "./tags.js";
import notificationsRouter from "./notifications.js";
import uploadRouter from "./upload.js";
import adminRouter from "./admin.js";
import badgesRouter from "./badges.js";
import communitiesRouter from "./communities.js";
import tipsRouter from "./tips.js";
import broadcastsRouter from "./broadcasts.js";
import adsRouter from "./ads.js";
import { db, postsTable, siteSettingsTable } from "@workspace/db";
import { ilike, eq, and, sql } from "drizzle-orm";
import { optionalAuth } from "../lib/auth.js";
import express from "express";
import path from "path";
import { existsSync, mkdirSync } from "fs";

const router = Router();

// Serve local uploads (dev only; production uses HuggingFace)
const uploadsDir =
  process.env.NODE_ENV === "production"
    ? "/tmp/uploads"
    : path.join(process.cwd(), "uploads");
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
router.use("/uploads", express.static(uploadsDir));

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/posts", postsRouter);
router.use("/posts", commentsRouter);
router.use("/comments", commentsRouter);
router.use("/users", usersRouter);
router.use("/tags", tagsRouter);
router.use("/notifications", notificationsRouter);
router.use("/upload", uploadRouter);
router.use("/admin", adminRouter);
router.use("/badges", badgesRouter);
router.use("/communities", communitiesRouter);
router.use("/tips", tipsRouter);
router.use("/broadcasts", broadcastsRouter);
router.use("/ads", adsRouter);

// Public status endpoint — always reachable, even during maintenance
router.get("/status", async (_req, res) => {
  try {
    const [settings] = await db.select({ maintenanceMode: siteSettingsTable.maintenanceMode })
      .from(siteSettingsTable).limit(1);
    res.json({ maintenanceMode: settings?.maintenanceMode ?? false });
  } catch {
    res.json({ maintenanceMode: false });
  }
});

// Search route
router.get("/search", optionalAuth, async (req, res) => {
  try {
    const { q, page = "1" } = req.query as any;
    const userId = (req as any).user?.id;

    if (!q) {
      res.status(400).json({ error: "Bad Request", message: "Query required" });
      return;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = 10;
    const offset = (pageNum - 1) * limitNum;

    const { postsTable, usersTable } = await import("@workspace/db");
    const { desc } = await import("drizzle-orm");

    const posts = await db.select().from(postsTable)
      .where(and(eq(postsTable.status, "approved"), ilike(postsTable.title, `%${q}%`)))
      .orderBy(desc(postsTable.points))
      .limit(limitNum).offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(postsTable)
      .where(and(eq(postsTable.status, "approved"), ilike(postsTable.title, `%${q}%`)));
    const total = Number(countResult?.count || 0);

    const authorIds = [...new Set(posts.map((p: any) => p.authorId))];
    const authors = authorIds.length ? await db.select().from(usersTable).where(
      (await import("drizzle-orm")).inArray(usersTable.id, authorIds)
    ) : [];
    const authorMap = new Map(authors.map((a: any) => [a.id, a]));

    const formatted = posts.map((p: any) => ({
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
        username: (authorMap as any).get(p.authorId)?.username || "unknown",
        avatar: (authorMap as any).get(p.authorId)?.avatar || null,
      },
      createdAt: p.createdAt,
    }));

    res.json({ posts: formatted, total, page: pageNum, totalPages: Math.ceil(total / limitNum), hasMore: offset + posts.length < total });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
