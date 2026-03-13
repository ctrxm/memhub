import { Router } from "express";
import { db, tagsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

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

export default router;
