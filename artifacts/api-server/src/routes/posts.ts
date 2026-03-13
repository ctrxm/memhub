import { Router } from "express";
import { db, postsTable, usersTable, votesTable, savedPostsTable, postTagsTable, tagsTable, followsTable } from "@workspace/db";
import { eq, and, desc, asc, sql, ilike, or, inArray } from "drizzle-orm";
import { authenticate, optionalAuth } from "../lib/auth.js";

const router = Router();

function formatPost(post: any, author: any, tags: any[], userVote: string | null, isSaved: boolean) {
  return {
    id: String(post.id),
    title: post.title,
    imageUrl: post.imageUrl,
    gifUrl: post.gifUrl || null,
    type: post.type,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    points: post.points,
    commentsCount: post.commentsCount,
    viewsCount: post.viewsCount,
    status: post.status,
    userVote,
    isSaved,
    tags: tags.map(t => ({
      id: String(t.id),
      name: t.name,
      slug: t.slug,
      postsCount: t.postsCount,
      color: t.color || null,
    })),
    author: {
      id: String(author.id),
      username: author.username,
      avatar: author.avatar || null,
    },
    createdAt: post.createdAt,
  };
}

async function getPostsWithDetails(posts: any[], userId?: number) {
  if (!posts.length) return [];

  const postIds = posts.map(p => p.id);
  const authorIds = [...new Set(posts.map(p => p.authorId))];

  const authors = await db.select().from(usersTable).where(inArray(usersTable.id, authorIds));
  const authorMap = new Map(authors.map(a => [a.id, a]));

  const allPostTags = await db.select({
    postId: postTagsTable.postId,
    tag: tagsTable,
  })
    .from(postTagsTable)
    .innerJoin(tagsTable, eq(postTagsTable.tagId, tagsTable.id))
    .where(inArray(postTagsTable.postId, postIds));

  const tagsMap = new Map<number, any[]>();
  allPostTags.forEach(({ postId, tag }) => {
    if (!tagsMap.has(postId)) tagsMap.set(postId, []);
    tagsMap.get(postId)!.push(tag);
  });

  let voteMap = new Map<number, string>();
  let savedSet = new Set<number>();

  if (userId) {
    const userVotes = await db.select()
      .from(votesTable)
      .where(and(eq(votesTable.userId, userId), inArray(votesTable.postId as any, postIds)));
    userVotes.forEach(v => { if (v.postId) voteMap.set(v.postId, v.direction); });

    const saved = await db.select({ postId: savedPostsTable.postId })
      .from(savedPostsTable)
      .where(and(eq(savedPostsTable.userId, userId), inArray(savedPostsTable.postId, postIds)));
    saved.forEach(s => savedSet.add(s.postId));
  }

  return posts.map(post => formatPost(
    post,
    authorMap.get(post.authorId),
    tagsMap.get(post.id) || [],
    voteMap.get(post.id) || null,
    savedSet.has(post.id)
  ));
}

// GET /posts
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { section = "hot", tag, page = "1", limit = "10" } = req.query as any;
    const userId = (req as any).user?.id;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let query = db.select().from(postsTable).where(eq(postsTable.status, "approved"));

    // Filter by tag
    if (tag) {
      const tagRow = await db.select().from(tagsTable).where(eq(tagsTable.slug, tag)).limit(1);
      if (tagRow.length) {
        const postIdsWithTag = await db.select({ postId: postTagsTable.postId })
          .from(postTagsTable)
          .where(eq(postTagsTable.tagId, tagRow[0].id));
        const ids = postIdsWithTag.map(r => r.postId);
        if (ids.length === 0) {
          res.json({ posts: [], total: 0, page: pageNum, totalPages: 0, hasMore: false });
          return;
        }
        // Build filtered query
        const posts = await db.select().from(postsTable)
          .where(and(eq(postsTable.status, "approved"), inArray(postsTable.id, ids)))
          .orderBy(section === "fresh" ? desc(postsTable.createdAt) : desc(postsTable.points))
          .limit(limitNum).offset(offset);
        const total = posts.length;
        const formatted = await getPostsWithDetails(posts, userId);
        res.json({ posts: formatted, total, page: pageNum, totalPages: Math.ceil(total / limitNum), hasMore: offset + posts.length < total });
        return;
      }
    }

    // Following section: posts from people the current user follows
    if (section === "following") {
      if (!userId) {
        res.json({ posts: [], total: 0, page: pageNum, totalPages: 0, hasMore: false });
        return;
      }
      const followingRows = await db.select({ followingId: followsTable.followingId })
        .from(followsTable).where(eq(followsTable.followerId, userId));
      const followingIds = followingRows.map(r => r.followingId);
      if (!followingIds.length) {
        res.json({ posts: [], total: 0, page: pageNum, totalPages: 0, hasMore: false });
        return;
      }
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(postsTable)
        .where(and(eq(postsTable.status, "approved"), inArray(postsTable.authorId, followingIds)));
      const total = Number(countResult?.count || 0);
      const posts = await db.select().from(postsTable)
        .where(and(eq(postsTable.status, "approved"), inArray(postsTable.authorId, followingIds)))
        .orderBy(desc(postsTable.createdAt)).limit(limitNum).offset(offset);
      const formatted = await getPostsWithDetails(posts, userId);
      res.json({ posts: formatted, total, page: pageNum, totalPages: Math.ceil(total / limitNum), hasMore: offset + posts.length < total });
      return;
    }

    let orderBy;
    switch (section) {
      case "hot":
        orderBy = desc(postsTable.points);
        break;
      case "trending":
        orderBy = desc(postsTable.viewsCount);
        break;
      case "fresh":
        orderBy = desc(postsTable.createdAt);
        break;
      case "top":
        orderBy = desc(postsTable.upvotes);
        break;
      default:
        orderBy = desc(postsTable.points);
    }

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(postsTable).where(eq(postsTable.status, "approved"));
    const total = Number(countResult?.count || 0);

    const posts = await db.select().from(postsTable)
      .where(eq(postsTable.status, "approved"))
      .orderBy(orderBy)
      .limit(limitNum)
      .offset(offset);

    const formatted = await getPostsWithDetails(posts, userId);

    res.json({
      posts: formatted,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      hasMore: offset + posts.length < total,
    });
  } catch (err) {
    console.error("Get posts error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /posts
router.post("/", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { title, imageUrl, type = "image", tagIds = [] } = req.body;

    if (!title || !imageUrl) {
      res.status(400).json({ error: "Bad Request", message: "Title and imageUrl required" });
      return;
    }

    const [post] = await db.insert(postsTable).values({
      title,
      imageUrl,
      type,
      authorId: user.id,
      status: "approved",
    }).returning();

    if (tagIds.length) {
      const tagIdNums = tagIds.map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id));
      if (tagIdNums.length) {
        await db.insert(postTagsTable).values(tagIdNums.map((tagId: number) => ({ postId: post.id, tagId })));
        await db.update(tagsTable).set({ postsCount: sql`${tagsTable.postsCount} + 1` })
          .where(inArray(tagsTable.id, tagIdNums));
      }
    }

    const formatted = await getPostsWithDetails([post], user.id);
    res.status(201).json(formatted[0]);
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /posts/:id
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = (req as any).user?.id;

    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
    if (!post) {
      res.status(404).json({ error: "Not Found", message: "Post not found" });
      return;
    }

    // Increment views
    await db.update(postsTable).set({ viewsCount: sql`${postsTable.viewsCount} + 1` }).where(eq(postsTable.id, postId));

    const [formatted] = await getPostsWithDetails([{ ...post, viewsCount: post.viewsCount + 1 }], userId);
    res.json(formatted);
  } catch (err) {
    console.error("Get post error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /posts/:id
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const user = (req as any).user;

    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
    if (!post) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    if (post.authorId !== user.id && user.role !== "admin" && user.role !== "moderator") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db.delete(postsTable).where(eq(postsTable.id, postId));
    res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /posts/:id/vote
router.post("/:id/vote", authenticate, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const user = (req as any).user;
    const { direction } = req.body;

    if (!["up", "down"].includes(direction)) {
      res.status(400).json({ error: "Bad Request", message: "Direction must be up or down" });
      return;
    }

    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
    if (!post) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    const [existingVote] = await db.select().from(votesTable)
      .where(and(eq(votesTable.userId, user.id), eq(votesTable.postId as any, postId)));

    let upvotesDelta = 0;
    let downvotesDelta = 0;
    let newVote: string | null = direction;

    if (existingVote) {
      if (existingVote.direction === direction) {
        // Remove vote (toggle off)
        await db.delete(votesTable).where(eq(votesTable.id, existingVote.id));
        if (direction === "up") upvotesDelta = -1;
        else downvotesDelta = -1;
        newVote = null;
      } else {
        // Change vote
        await db.update(votesTable).set({ direction }).where(eq(votesTable.id, existingVote.id));
        if (direction === "up") { upvotesDelta = 1; downvotesDelta = -1; }
        else { upvotesDelta = -1; downvotesDelta = 1; }
      }
    } else {
      await db.insert(votesTable).values({ userId: user.id, postId, direction });
      if (direction === "up") upvotesDelta = 1;
      else downvotesDelta = 1;
    }

    const newUpvotes = post.upvotes + upvotesDelta;
    const newDownvotes = post.downvotes + downvotesDelta;
    const newPoints = newUpvotes - newDownvotes;

    await db.update(postsTable).set({
      upvotes: newUpvotes,
      downvotes: newDownvotes,
      points: newPoints,
    }).where(eq(postsTable.id, postId));

    // Update author points
    await db.update(usersTable).set({
      totalPoints: sql`${usersTable.totalPoints} + ${upvotesDelta - downvotesDelta}`,
    }).where(eq(usersTable.id, post.authorId));

    res.json({ upvotes: newUpvotes, downvotes: newDownvotes, points: newPoints, userVote: newVote });
  } catch (err) {
    console.error("Vote error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /posts/:id/report
router.post("/:id/report", authenticate, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const user = (req as any).user;
    const { reason = "spam" } = req.body;

    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
    if (!post) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    if (post.authorId === user.id) {
      res.status(400).json({ error: "Bad Request", message: "Cannot report your own post" });
      return;
    }
    res.json({ success: true, message: "Post reported. Our moderators will review it." });
  } catch (err) {
    console.error("Report post error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /posts/:id/save
router.post("/:id/save", authenticate, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const user = (req as any).user;

    const [existing] = await db.select().from(savedPostsTable)
      .where(and(eq(savedPostsTable.userId, user.id), eq(savedPostsTable.postId, postId)));

    if (existing) {
      await db.delete(savedPostsTable).where(eq(savedPostsTable.id, existing.id));
      res.json({ isSaved: false });
    } else {
      await db.insert(savedPostsTable).values({ userId: user.id, postId });
      res.json({ isSaved: true });
    }
  } catch (err) {
    console.error("Save post error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /search
router.get("/search/results", optionalAuth, async (req, res) => {
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

    const posts = await db.select().from(postsTable)
      .where(and(eq(postsTable.status, "approved"), ilike(postsTable.title, `%${q}%`)))
      .orderBy(desc(postsTable.points))
      .limit(limitNum)
      .offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(postsTable)
      .where(and(eq(postsTable.status, "approved"), ilike(postsTable.title, `%${q}%`)));
    const total = Number(countResult?.count || 0);

    const formatted = await getPostsWithDetails(posts, userId);
    res.json({ posts: formatted, total, page: pageNum, totalPages: Math.ceil(total / limitNum), hasMore: offset + posts.length < total });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
