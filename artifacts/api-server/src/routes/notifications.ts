import { Router } from "express";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq, desc, sql, inArray, and } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const page = Math.max(1, parseInt((req.query.page as string) || "1"));
    const limit = 20;
    const offset = (page - 1) * limit;

    const notifications = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, user.id))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit).offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(notificationsTable).where(eq(notificationsTable.userId, user.id));
    const total = Number(countResult?.count || 0);

    const [unreadResult] = await db.select({ count: sql<number>`count(*)` })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));
    const unreadCount = Number(unreadResult?.count || 0);

    const fromUserIds = [...new Set(notifications.map(n => n.fromUserId))];
    let fromUsersMap = new Map<number, any>();

    if (fromUserIds.length) {
      const fromUsers = await db.select().from(usersTable).where(inArray(usersTable.id, fromUserIds));
      fromUsersMap = new Map(fromUsers.map(u => [u.id, u]));
    }

    const formatted = notifications.map(n => ({
      id: String(n.id),
      type: n.type,
      message: n.message,
      isRead: n.isRead,
      postId: n.postId ? String(n.postId) : null,
      fromUser: {
        id: String(n.fromUserId),
        username: fromUsersMap.get(n.fromUserId)?.username || "unknown",
        avatar: fromUsersMap.get(n.fromUserId)?.avatar || null,
      },
      createdAt: n.createdAt,
    }));

    res.json({ notifications: formatted, unreadCount, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/read", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    await db.update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.userId, user.id));
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
