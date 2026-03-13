import { Router } from "express";
import { db, badgesTable, userBadgesTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAdmin, optionalAuth } from "../lib/auth.js";

const router = Router();

// Predefined icon set for badge generation
export const BADGE_ICONS = [
  { id: "verified", label: "Verified", svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
  { id: "og", label: "OG", svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor"/></svg>` },
  { id: "fire", label: "Hot", svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C6.477 22 2 17.523 2 12C2 8 4 5 7 3C6.5 5 7 7 9 8C9 5 10.5 3 13 2C13 4 14 5.5 16 6C17 5 18 3.5 18.5 2C20.5 4 22 7 22 12C22 17.523 17.523 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor"/></svg>` },
  { id: "crown", label: "King", svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 17L5 8L9 13L12 5L15 13L19 8L22 17H2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor"/><path d="M2 20H22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` },
  { id: "bolt", label: "Power", svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L4.5 13.5H11L9 22L19.5 9.5H13L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor"/></svg>` },
  { id: "diamond", label: "Diamond", svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.7 7.5L5.5 3H18.5L21.3 7.5L12 21L2.7 7.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor"/><path d="M2.7 7.5H21.3" stroke="currentColor" stroke-width="2"/><path d="M8.5 3L6 7.5L12 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15.5 3L18 7.5L12 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` },
  { id: "ghost", label: "Ghost", svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3C8.13 3 5 6.13 5 10V21L7.5 19L10 21L12 19L14 21L16.5 19L19 21V10C19 6.13 15.87 3 12 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor"/><circle cx="9" cy="11" r="1" fill="white"/><circle cx="15" cy="11" r="1" fill="white"/></svg>` },
  { id: "rocket", label: "Rocket", svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C12 2 7 6 7 13H17C17 6 12 2 12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor"/><path d="M7 13L5 17H19L17 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 13V17" stroke="currentColor" stroke-width="2"/><path d="M15 13V17" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9" r="2" fill="white"/></svg>` },
];

// GET /badges — list all badges (public)
router.get("/", optionalAuth, async (_req, res) => {
  try {
    const badges = await db.select().from(badgesTable);
    res.json({ badges: badges.map(formatBadge) });
  } catch (err) {
    console.error("List badges error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /badges/icons — predefined icon set (public)
router.get("/icons", (_req, res) => {
  res.json({ icons: BADGE_ICONS });
});

// POST /badges — create badge (admin only)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { name, description, icon, color, bgColor, isVerified } = req.body;
    if (!name) {
      res.status(400).json({ error: "Bad Request", message: "Name required" });
      return;
    }
    const [badge] = await db.insert(badgesTable).values({
      name,
      description: description || null,
      icon: icon || "⭐",
      color: color || "#FF6600",
      bgColor: bgColor || "#1a1a1a",
      isVerified: isVerified || false,
    }).returning();
    res.status(201).json(formatBadge(badge));
  } catch (err) {
    console.error("Create badge error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /badges/:id — delete badge (admin only)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const badgeId = parseInt(req.params.id);
    await db.delete(userBadgesTable).where(eq(userBadgesTable.badgeId, badgeId));
    await db.delete(badgesTable).where(eq(badgesTable.id, badgeId));
    res.json({ success: true });
  } catch (err) {
    console.error("Delete badge error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /badges/:id/award — award badge to user (admin only)
router.post("/:id/award", requireAdmin, async (req, res) => {
  try {
    const badgeId = parseInt(req.params.id);
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "Bad Request", message: "userId required" });
      return;
    }
    const existing = await db.select().from(userBadgesTable)
      .where(and(eq(userBadgesTable.userId, parseInt(userId)), eq(userBadgesTable.badgeId, badgeId)));
    if (existing.length) {
      res.status(409).json({ error: "Conflict", message: "Badge already awarded" });
      return;
    }
    await db.insert(userBadgesTable).values({ userId: parseInt(userId), badgeId });
    res.json({ success: true, message: "Badge awarded" });
  } catch (err) {
    console.error("Award badge error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /badges/:id/revoke/:userId — revoke badge (admin only)
router.delete("/:id/revoke/:userId", requireAdmin, async (req, res) => {
  try {
    const badgeId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    await db.delete(userBadgesTable).where(
      and(eq(userBadgesTable.userId, userId), eq(userBadgesTable.badgeId, badgeId))
    );
    res.json({ success: true, message: "Badge revoked" });
  } catch (err) {
    console.error("Revoke badge error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export async function getUserBadges(userId: number) {
  const userBadgeRows = await db.select({ badgeId: userBadgesTable.badgeId })
    .from(userBadgesTable)
    .where(eq(userBadgesTable.userId, userId));

  if (!userBadgeRows.length) return [];

  const badgeIds = userBadgeRows.map(r => r.badgeId);
  const badges = await db.select().from(badgesTable)
    .where(inArray(badgesTable.id, badgeIds));

  return badges.map(formatBadge);
}

export function formatBadge(badge: any) {
  return {
    id: String(badge.id),
    name: badge.name,
    description: badge.description || null,
    icon: badge.icon,
    color: badge.color,
    bgColor: badge.bgColor,
    isVerified: badge.isVerified,
    createdAt: badge.createdAt,
  };
}

export default router;
