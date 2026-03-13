import { Router } from "express";
import { db, usersTable, followsTable, postsTable, savedPostsTable } from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { authenticate, optionalAuth } from "../lib/auth.js";
import { getUserBadges } from "./badges.js";

const router = Router();

async function getUserProfile(targetUser: any, currentUserId?: number) {
  const [followersResult] = await db.select({ count: sql<number>`count(*)` })
    .from(followsTable).where(eq(followsTable.followingId, targetUser.id));
  
  const [followingResult] = await db.select({ count: sql<number>`count(*)` })
    .from(followsTable).where(eq(followsTable.followerId, targetUser.id));

  const [postsResult] = await db.select({ count: sql<number>`count(*)` })
    .from(postsTable).where(eq(postsTable.authorId, targetUser.id));

  let isFollowing = false;
  if (currentUserId) {
    const [followRow] = await db.select({ id: followsTable.id })
      .from(followsTable)
      .where(and(eq(followsTable.followerId, currentUserId), eq(followsTable.followingId, targetUser.id)));
    isFollowing = !!followRow;
  }

  const badges = await getUserBadges(targetUser.id);

  return {
    id: String(targetUser.id),
    username: targetUser.username,
    email: targetUser.email,
    avatar: targetUser.avatar || null,
    bio: targetUser.bio || null,
    role: targetUser.role,
    isBanned: targetUser.isBanned,
    followersCount: Number(followersResult?.count || 0),
    followingCount: Number(followingResult?.count || 0),
    postsCount: Number(postsResult?.count || 0),
    totalPoints: targetUser.totalPoints,
    isFollowing,
    badges,
    createdAt: targetUser.createdAt,
  };
}

// GET /users/:username
router.get("/:username", optionalAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, req.params.username as string));
    if (!user) {
      res.status(404).json({ error: "Not Found", message: "User not found" });
      return;
    }
    const currentUserId = (req as any).user?.id;
    const profile = await getUserProfile(user, currentUserId);
    res.json(profile);
  } catch (err) {
    console.error("Get user profile error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /users/:username/posts
router.get("/:username/posts", optionalAuth, async (req, res) => {
  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, req.params.username as string));
    if (!user) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    const page = Math.max(1, parseInt((req.query.page as string) || "1"));
    const limit = 10;
    const offset = (page - 1) * limit;

    const posts = await db.select().from(postsTable)
      .where(eq(postsTable.authorId, user.id))
      .orderBy(desc(postsTable.createdAt))
      .limit(limit).offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(postsTable).where(eq(postsTable.authorId, user.id));
    const total = Number(countResult?.count || 0);

    // Import post formatting
    const { default: postsRouter } = await import("./posts.js");

    // Simple formatting without full import
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
      author: { id: String(user.id), username: req.params.username, avatar: null },
      createdAt: p.createdAt,
    }));

    res.json({ posts: formatted, total, page, totalPages: Math.ceil(total / limit), hasMore: offset + posts.length < total });
  } catch (err) {
    console.error("Get user posts error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /users/:username/follow
router.post("/:username/follow", authenticate, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    const [targetUser] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, req.params.username as string));
    
    if (!targetUser) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    if (targetUser.id === currentUser.id) {
      res.status(400).json({ error: "Bad Request", message: "Cannot follow yourself" });
      return;
    }

    const [existing] = await db.select().from(followsTable)
      .where(and(eq(followsTable.followerId, currentUser.id), eq(followsTable.followingId, targetUser.id)));

    if (existing) {
      await db.delete(followsTable).where(eq(followsTable.id, existing.id));
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(followsTable).where(eq(followsTable.followingId, targetUser.id));
      res.json({ isFollowing: false, followersCount: Number(countResult?.count || 0) });
    } else {
      await db.insert(followsTable).values({ followerId: currentUser.id, followingId: targetUser.id });
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(followsTable).where(eq(followsTable.followingId, targetUser.id));
      
      // Create follow notification
      const { notificationsTable } = await import("@workspace/db");
      await db.insert(notificationsTable).values({
        userId: targetUser.id,
        fromUserId: currentUser.id,
        type: "follow",
        message: `${currentUser.username} started following you`,
      });

      res.json({ isFollowing: true, followersCount: Number(countResult?.count || 0) });
    }
  } catch (err) {
    console.error("Follow user error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /users/me/profile
router.put("/me/profile", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { bio, avatar } = req.body;

    const updates: any = {};
    if (bio !== undefined) updates.bio = bio;
    if (avatar !== undefined) updates.avatar = avatar;

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();
    const profile = await getUserProfile(updated, user.id);
    res.json(profile);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /users/me/saved
router.get("/me/saved", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const page = Math.max(1, parseInt((req.query.page as string) || "1"));
    const limit = 10;
    const offset = (page - 1) * limit;

    const savedPostIds = await db.select({ postId: savedPostsTable.postId })
      .from(savedPostsTable)
      .where(eq(savedPostsTable.userId, user.id))
      .orderBy(desc(savedPostsTable.createdAt))
      .limit(limit).offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(savedPostsTable).where(eq(savedPostsTable.userId, user.id));
    const total = Number(countResult?.count || 0);

    if (!savedPostIds.length) {
      res.json({ posts: [], total: 0, page, totalPages: 0, hasMore: false });
      return;
    }

    const ids = savedPostIds.map(s => s.postId);
    const posts = await db.select().from(postsTable).where(inArray(postsTable.id, ids));
    const authorIds = [...new Set(posts.map(p => p.authorId))];
    const authors = await db.select().from(usersTable).where(inArray(usersTable.id, authorIds));
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
      isSaved: true,
      tags: [],
      author: { id: String(p.authorId), username: authorMap.get(p.authorId)?.username || "unknown", avatar: authorMap.get(p.authorId)?.avatar || null },
      createdAt: p.createdAt,
    }));

    res.json({ posts: formatted, total, page, totalPages: Math.ceil(total / limit), hasMore: offset + posts.length < total });
  } catch (err) {
    console.error("Get saved posts error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /users/me — update own profile
router.put("/me", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { bio, avatar, username } = req.body;

    const updates: any = {};
    if (bio !== undefined) updates.bio = bio;
    if (avatar !== undefined) updates.avatar = avatar;
    if (username && username !== user.username) {
      const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, username));
      if (existing) {
        res.status(409).json({ error: "Conflict", message: "Username already taken" });
        return;
      }
      updates.username = username;
    }

    if (!Object.keys(updates).length) {
      res.status(400).json({ error: "Bad Request", message: "No fields to update" });
      return;
    }

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();
    const profile = await getUserProfile(updated, user.id);
    res.json(profile);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
