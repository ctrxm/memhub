import { Router } from "express";
import { db, adsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authenticate, requireAdmin } from "../lib/auth.js";

const router = Router();

// Public: get active ads by position
router.get("/position/:position", async (req, res) => {
  const position = req.params.position as any;
  try {
    const rows = await db.select().from(adsTable)
      .where(eq(adsTable.isActive, true))
      .orderBy(desc(adsTable.createdAt));
    const filtered = rows.filter(r => r.position === position);
    // Track impressions
    if (filtered.length) {
      await db.update(adsTable)
        .set({ impressionCount: filtered[0].impressionCount + 1 })
        .where(eq(adsTable.id, filtered[0].id));
    }
    res.json({ ads: filtered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Public: track click
router.post("/:id/click", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [ad] = await db.select().from(adsTable).where(eq(adsTable.id, id));
    if (ad) {
      await db.update(adsTable).set({ clickCount: ad.clickCount + 1 }).where(eq(adsTable.id, id));
    }
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

// Admin: get all ads
router.get("/", authenticate, requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(adsTable).orderBy(desc(adsTable.createdAt));
    res.json({ ads: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: create ad
router.post("/", authenticate, requireAdmin, async (req, res) => {
  const { title, content, imageUrl, linkUrl, position } = req.body;
  const userId = (req as any).user?.id;
  if (!title) { res.status(400).json({ message: "title is required" }); return; }
  try {
    const [row] = await db.insert(adsTable).values({
      title,
      content: content || null,
      imageUrl: imageUrl || null,
      linkUrl: linkUrl || null,
      position: position || "feed_middle",
      isActive: true,
      createdBy: userId,
    }).returning();
    res.json({ ad: row });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: update ad
router.put("/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, content, imageUrl, linkUrl, position, isActive } = req.body;
  try {
    const [updated] = await db.update(adsTable)
      .set({ title, content, imageUrl, linkUrl, position, isActive })
      .where(eq(adsTable.id, id))
      .returning();
    res.json({ ad: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: toggle active
router.patch("/:id/toggle", authenticate, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [current] = await db.select().from(adsTable).where(eq(adsTable.id, id));
    if (!current) { res.status(404).json({ message: "Not found" }); return; }
    const [updated] = await db.update(adsTable)
      .set({ isActive: !current.isActive })
      .where(eq(adsTable.id, id))
      .returning();
    res.json({ ad: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: delete ad
router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(adsTable).where(eq(adsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
