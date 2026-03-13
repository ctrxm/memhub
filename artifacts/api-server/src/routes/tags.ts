import { Router } from "express";
import { db, tagsTable, postTagsTable, postsTable, usersTable, votesTable, savedPostsTable } from "@workspace/db";
import { desc, eq, inArray, and, sql } from "drizzle-orm";
import { optionalAuth } from "../lib/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const tags = await db.select().from(tagsTable).orderBy(desc(tagsTable.postsCount));
    res.json({
      tags: tags.map(t => ({
        id: String(t.id),
        name: t.name,
        slug: t.slug,
        postsCount: t.postsCount,
        color: t.color || null,
      })),
    });
  } catch (err) {
    console.error("Get tags error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const [tag] = await db.select().from(tagsTable).where(eq(tagsTable.slug, req.params.slug as string));
    if (!tag) {
      res.status(404).json({ error: "Not Found", message: "Tag not found" });
      return;
    }
    res.json({ id: String(tag.id), name: tag.name, slug: tag.slug, postsCount: tag.postsCount, color: tag.color || null });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:slug/posts", optionalAuth, async (req, res) => {
  try {
    const slug = req.params.slug as string;
    const page = Math.max(1, parseInt((req.query.page as string) || "1"));
    const limit = 10;
    const offset = (page - 1) * limit;
    const userId = (req as any).user?.id;

    const [tag] = await db.select().from(tagsTable).where(eq(tagsTable.slug, slug));
    if (!tag) {
      res.status(404).json({ error: "Not Found", message: "Tag not found" });
      return;
    }

    const postIdsRows = await db.select({ postId: postTagsTable.postId })
      .from(postTagsTable)
      .where(eq(postTagsTable.tagId, tag.id))
      .limit(limit).offset(offset);

    const postIds = postIdsRows.map(r => r.postId);

    const [totalResult] = await db.select({ count: sql<number>`count(*)` })
      .from(postTagsTable).where(eq(postTagsTable.tagId, tag.id));
    const total = Number(totalResult?.count || 0);

    if (!postIds.length) {
      res.json({ posts: [], total: 0, page, totalPages: 0, hasMore: false, tag: { id: String(tag.id), name: tag.name, slug: tag.slug, postsCount: tag.postsCount } });
      return;
    }

    const posts = await db.select().from(postsTable)
      .where(and(inArray(postsTable.id, postIds), eq(postsTable.status, "approved")))
      .orderBy(desc(postsTable.points));

    const authorIds = [...new Set(posts.map(p => p.authorId))];
    const authors = authorIds.length ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds)) : [];
    const authorMap = new Map(authors.map(a => [a.id, a]));

    let voteMap = new Map<number, string>();
    let savedSet = new Set<number>();
    if (userId) {
      const votes = await db.select().from(votesTable).where(and(eq(votesTable.userId, userId), inArray(votesTable.postId as any, postIds)));
      votes.forEach(v => { if (v.postId) voteMap.set(v.postId, v.direction); });
      const saved = await db.select({ postId: savedPostsTable.postId }).from(savedPostsTable).where(and(eq(savedPostsTable.userId, userId), inArray(savedPostsTable.postId, postIds)));
      saved.forEach(s => savedSet.add(s.postId));
    }

    const allPostTags = await db.select({ postId: postTagsTable.postId, tag: tagsTable })
      .from(postTagsTable).innerJoin(tagsTable, eq(postTagsTable.tagId, tagsTable.id))
      .where(inArray(postTagsTable.postId, postIds));
    const tagsMap = new Map<number, any[]>();
    allPostTags.forEach(({ postId, tag: t }) => {
      if (!tagsMap.has(postId)) tagsMap.set(postId, []);
      tagsMap.get(postId)!.push({ id: String(t.id), name: t.name, slug: t.slug, postsCount: t.postsCount, color: t.color || null });
    });

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
      userVote: voteMap.get(p.id) || null,
      isSaved: savedSet.has(p.id),
      tags: tagsMap.get(p.id) || [],
      author: { id: String(p.authorId), username: authorMap.get(p.authorId)?.username || "unknown", avatar: authorMap.get(p.authorId)?.avatar || null },
      createdAt: p.createdAt,
    }));

    res.json({ posts: formatted, total, page, totalPages: Math.ceil(total / limit), hasMore: offset + posts.length < total, tag: { id: String(tag.id), name: tag.name, slug: tag.slug, postsCount: tag.postsCount } });
  } catch (err) {
    console.error("Get tag posts error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
