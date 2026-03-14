import { Router } from "express";
import { db, broadcastsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authenticate, requireAdmin } from "../lib/auth.js";

const router = Router();

// Public: get all active broadcasts
router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(broadcastsTable)
      .where(eq(broadcastsTable.isActive, true))
      .orderBy(desc(broadcastsTable.createdAt));
    res.json({ broadcasts: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: get all broadcasts
router.get("/all", authenticate, requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(broadcastsTable).orderBy(desc(broadcastsTable.createdAt));
    res.json({ broadcasts: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: create broadcast
router.post("/", authenticate, requireAdmin, async (req, res) => {
  const { title, content, type } = req.body;
  const userId = (req as any).user?.id;
  if (!title || !content) {
    res.status(400).json({ message: "title and content are required" });
    return;
  }
  try {
    const [row] = await db.insert(broadcastsTable).values({
      title,
      content,
      type: type || "info",
      isActive: true,
      createdBy: userId,
    }).returning();
    res.json({ broadcast: row });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: toggle active
router.patch("/:id/toggle", authenticate, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [current] = await db.select().from(broadcastsTable).where(eq(broadcastsTable.id, id));
    if (!current) { res.status(404).json({ message: "Not found" }); return; }
    const [updated] = await db.update(broadcastsTable)
      .set({ isActive: !current.isActive })
      .where(eq(broadcastsTable.id, id))
      .returning();
    res.json({ broadcast: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: delete broadcast
router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(broadcastsTable).where(eq(broadcastsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
