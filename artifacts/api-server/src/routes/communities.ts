import { Router } from "express";
import { db, communitiesTable, communityMembersTable, postsTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql, ilike } from "drizzle-orm";
import { authenticate, optionalAuth } from "../lib/auth.js";

const router = Router();

// GET /communities — list all communities
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { q } = req.query;
    let query = db.select().from(communitiesTable).orderBy(desc(communitiesTable.membersCount));
    if (q) {
      query = db.select().from(communitiesTable)
        .where(ilike(communitiesTable.name, `%${q}%`))
        .orderBy(desc(communitiesTable.membersCount)) as any;
    }
    const communities = await query;

    const currentUserId = (req as any).userId;
    let joinedIds = new Set<number>();
    if (currentUserId) {
      const memberships = await db.select({ communityId: communityMembersTable.communityId })
        .from(communityMembersTable)
        .where(eq(communityMembersTable.userId, currentUserId));
      joinedIds = new Set(memberships.map(m => m.communityId));
    }

    res.json({
      communities: communities.map(c => ({
        ...c,
        id: String(c.id),
        isMember: joinedIds.has(c.id),
      })),
    });
  } catch (err) {
    console.error("List communities error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /communities/:slug — get community details
router.get("/:slug", optionalAuth, async (req, res) => {
  try {
    const [community] = await db.select().from(communitiesTable)
      .where(eq(communitiesTable.slug, req.params.slug));
    if (!community) { res.status(404).json({ error: "Community not found" }); return; }

    const currentUserId = (req as any).userId;
    let isMember = false;
    let memberRole: string | null = null;
    if (currentUserId) {
      const [mem] = await db.select().from(communityMembersTable)
        .where(and(eq(communityMembersTable.communityId, community.id), eq(communityMembersTable.userId, currentUserId)));
      isMember = !!mem;
      memberRole = mem?.role || null;
    }

    res.json({ community: { ...community, id: String(community.id), isMember, memberRole } });
  } catch (err) {
    console.error("Get community error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /communities/:slug/posts — posts in a community
router.get("/:slug/posts", optionalAuth, async (req, res) => {
  try {
    const [community] = await db.select().from(communitiesTable)
      .where(eq(communitiesTable.slug, req.params.slug));
    if (!community) { res.status(404).json({ error: "Community not found" }); return; }

    const posts = await db.select({
      post: postsTable,
      author: { id: usersTable.id, username: usersTable.username, avatar: usersTable.avatar },
    })
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(eq(postsTable.communityId, community.id))
      .orderBy(desc(postsTable.createdAt))
      .limit(20);

    res.json({
      posts: posts.map(({ post, author }) => ({
        ...post,
        id: String(post.id),
        author: { id: String(author.id), username: author.username, avatar: author.avatar },
        tags: [],
      })),
    });
  } catch (err) {
    console.error("Community posts error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /communities — create a community
router.post("/", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { name, description, icon, bannerColor, isPrivate } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "Name is required" }); return; }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const existing = await db.select({ id: communitiesTable.id }).from(communitiesTable)
      .where(eq(communitiesTable.slug, slug));
    if (existing.length) { res.status(409).json({ error: "Community with this name already exists" }); return; }

    const [community] = await db.insert(communitiesTable).values({
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      icon: icon || "🌐",
      bannerColor: bannerColor || "#FF6600",
      isPrivate: isPrivate || false,
      createdById: userId,
      membersCount: 1,
    }).returning();

    await db.insert(communityMembersTable).values({ communityId: community.id, userId, role: "admin" });
    res.status(201).json({ community: { ...community, id: String(community.id), isMember: true, memberRole: "admin" } });
  } catch (err) {
    console.error("Create community error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /communities/:slug/join
router.post("/:slug/join", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const [community] = await db.select().from(communitiesTable)
      .where(eq(communitiesTable.slug, req.params.slug));
    if (!community) { res.status(404).json({ error: "Community not found" }); return; }

    const [existing] = await db.select().from(communityMembersTable)
      .where(and(eq(communityMembersTable.communityId, community.id), eq(communityMembersTable.userId, userId)));
    if (existing) { res.json({ isMember: true }); return; }

    await db.insert(communityMembersTable).values({ communityId: community.id, userId, role: "member" });
    await db.update(communitiesTable)
      .set({ membersCount: sql`${communitiesTable.membersCount} + 1` })
      .where(eq(communitiesTable.id, community.id));

    res.json({ isMember: true, message: "Joined community" });
  } catch (err) {
    console.error("Join community error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /communities/:slug/leave
router.delete("/:slug/leave", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const [community] = await db.select().from(communitiesTable)
      .where(eq(communitiesTable.slug, req.params.slug));
    if (!community) { res.status(404).json({ error: "Community not found" }); return; }

    await db.delete(communityMembersTable)
      .where(and(eq(communityMembersTable.communityId, community.id), eq(communityMembersTable.userId, userId)));
    await db.update(communitiesTable)
      .set({ membersCount: sql`GREATEST(${communitiesTable.membersCount} - 1, 0)` })
      .where(eq(communitiesTable.id, community.id));

    res.json({ isMember: false, message: "Left community" });
  } catch (err) {
    console.error("Leave community error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /communities/:slug — delete community (admin or creator only)
router.delete("/:slug", authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const [community] = await db.select().from(communitiesTable)
      .where(eq(communitiesTable.slug, req.params.slug));
    if (!community) { res.status(404).json({ error: "Community not found" }); return; }

    const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
    const [mem] = await db.select().from(communityMembersTable)
      .where(and(eq(communityMembersTable.communityId, community.id), eq(communityMembersTable.userId, userId)));

    if (user?.role !== "admin" && mem?.role !== "admin" && community.createdById !== userId) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    await db.delete(communitiesTable).where(eq(communitiesTable.id, community.id));
    res.json({ success: true });
  } catch (err) {
    console.error("Delete community error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
