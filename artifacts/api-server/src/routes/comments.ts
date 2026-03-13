import { Router } from "express";
import { db, commentsTable, usersTable, postsTable, votesTable, notificationsTable } from "@workspace/db";
import { eq, and, isNull, desc, sql, inArray } from "drizzle-orm";
import { authenticate, optionalAuth } from "../lib/auth.js";

const router = Router();

function formatComment(comment: any, author: any, userVote: string | null, replies: any[] = []): any {
  return {
    id: String(comment.id),
    content: comment.content,
    upvotes: comment.upvotes,
    downvotes: comment.downvotes,
    userVote,
    author: {
      id: String(author.id),
      username: author.username,
      avatar: author.avatar || null,
    },
    parentId: comment.parentId ? String(comment.parentId) : null,
    replies,
    createdAt: comment.createdAt,
  };
}

// GET /posts/:id/comments
router.get("/:id/comments", optionalAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id as string);
    const userId = (req as any).user?.id;
    const page = Math.max(1, parseInt((req.query.page as string) || "1"));
    const limit = 20;
    const offset = (page - 1) * limit;

    // Get top-level comments
    const topComments = await db.select().from(commentsTable)
      .where(and(eq(commentsTable.postId, postId), isNull(commentsTable.parentId)))
      .orderBy(desc(commentsTable.upvotes), desc(commentsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(commentsTable)
      .where(and(eq(commentsTable.postId, postId), isNull(commentsTable.parentId)));
    const total = Number(countResult?.count || 0);

    if (!topComments.length) {
      res.json({ comments: [], total: 0, page, totalPages: 0 });
      return;
    }

    const commentIds = topComments.map(c => c.id);
    const authorIds = [...new Set(topComments.map(c => c.authorId))];

    // Get replies for each comment
    const replies = await db.select().from(commentsTable)
      .where(and(eq(commentsTable.postId, postId), inArray(commentsTable.parentId as any, commentIds)))
      .orderBy(desc(commentsTable.createdAt));

    const allCommentIds = [...commentIds, ...replies.map(r => r.id)];
    const allAuthorIds = [...new Set([...authorIds, ...replies.map(r => r.authorId)])];

    const authors = await db.select().from(usersTable).where(inArray(usersTable.id, allAuthorIds));
    const authorMap = new Map(authors.map(a => [a.id, a]));

    let voteMap = new Map<number, string>();
    if (userId) {
      const userVotes = await db.select().from(votesTable)
        .where(and(eq(votesTable.userId, userId), inArray(votesTable.commentId as any, allCommentIds)));
      userVotes.forEach(v => { if (v.commentId) voteMap.set(v.commentId, v.direction); });
    }

    const repliesMap = new Map<number, any[]>();
    replies.forEach(r => {
      const parentId = r.parentId!;
      if (!repliesMap.has(parentId)) repliesMap.set(parentId, []);
      repliesMap.get(parentId)!.push(
        formatComment(r, authorMap.get(r.authorId), voteMap.get(r.id) || null)
      );
    });

    const formatted = topComments.map(c =>
      formatComment(c, authorMap.get(c.authorId), voteMap.get(c.id) || null, repliesMap.get(c.id) || [])
    );

    res.json({ comments: formatted, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Get comments error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /posts/:id/comments
router.post("/:id/comments", authenticate, async (req, res) => {
  try {
    const postId = parseInt(req.params.id as string);
    const user = (req as any).user;
    const { content, parentId } = req.body;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: "Bad Request", message: "Content required" });
      return;
    }

    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
    if (!post) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    const [comment] = await db.insert(commentsTable).values({
      content: content.trim(),
      postId,
      authorId: user.id,
      parentId: parentId ? parseInt(parentId) : null,
    }).returning();

    // Update comments count
    await db.update(postsTable).set({ commentsCount: sql`${postsTable.commentsCount} + 1` })
      .where(eq(postsTable.id, postId));

    // Create notification for post author
    if (post.authorId !== user.id) {
      await db.insert(notificationsTable).values({
        userId: post.authorId,
        fromUserId: user.id,
        type: parentId ? "reply" : "comment",
        message: `${user.username} ${parentId ? "replied to a comment" : "commented"} on your post`,
        postId,
      });
    }

    res.status(201).json(formatComment(comment, user, null));
  } catch (err) {
    console.error("Create comment error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /comments/:id/vote
router.post("/:id/vote", authenticate, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id as string);
    const user = (req as any).user;
    const { direction } = req.body;

    if (!["up", "down"].includes(direction)) {
      res.status(400).json({ error: "Bad Request" });
      return;
    }

    const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId));
    if (!comment) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    const [existing] = await db.select().from(votesTable)
      .where(and(eq(votesTable.userId, user.id), eq(votesTable.commentId as any, commentId)));

    let upvotesDelta = 0;
    let downvotesDelta = 0;
    let newVote: string | null = direction;

    if (existing) {
      if (existing.direction === direction) {
        await db.delete(votesTable).where(eq(votesTable.id, existing.id));
        if (direction === "up") upvotesDelta = -1;
        else downvotesDelta = -1;
        newVote = null;
      } else {
        await db.update(votesTable).set({ direction }).where(eq(votesTable.id, existing.id));
        if (direction === "up") { upvotesDelta = 1; downvotesDelta = -1; }
        else { upvotesDelta = -1; downvotesDelta = 1; }
      }
    } else {
      await db.insert(votesTable).values({ userId: user.id, commentId, direction });
      if (direction === "up") upvotesDelta = 1;
      else downvotesDelta = 1;
    }

    const newUpvotes = comment.upvotes + upvotesDelta;
    const newDownvotes = comment.downvotes + downvotesDelta;

    await db.update(commentsTable).set({ upvotes: newUpvotes, downvotes: newDownvotes })
      .where(eq(commentsTable.id, commentId));

    res.json({ upvotes: newUpvotes, downvotes: newDownvotes, points: newUpvotes - newDownvotes, userVote: newVote });
  } catch (err) {
    console.error("Vote comment error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /comments/:id
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id as string);
    const user = (req as any).user;

    const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId));
    if (!comment) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    if (comment.authorId !== user.id && user.role !== "admin" && user.role !== "moderator") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db.delete(commentsTable).where(eq(commentsTable.id, commentId));
    await db.update(postsTable).set({ commentsCount: sql`${postsTable.commentsCount} - 1` })
      .where(eq(postsTable.id, comment.postId));

    res.json({ success: true, message: "Comment deleted" });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
