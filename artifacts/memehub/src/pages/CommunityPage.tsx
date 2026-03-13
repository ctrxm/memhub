import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { PostCard } from "@/components/post/PostCard";
import { Button } from "@/components/ui/shared";
import { motion } from "framer-motion";
import { Users, TrendingUp, Lock, ArrowLeft, Globe } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/utils";

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  bannerColor: string;
  membersCount: number;
  postsCount: number;
  isPrivate: boolean;
  isMember: boolean;
  memberRole: string | null;
}

export default function CommunityPage() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const token = localStorage.getItem("ovrhub_token") || localStorage.getItem("memehub_token");
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      fetch(`${BASE}/api/communities/${slug}`, { headers: authHeaders }).then(r => r.json()),
      fetch(`${BASE}/api/communities/${slug}/posts`, { headers: authHeaders }).then(r => r.json()),
    ]).then(([cData, pData]) => {
      setCommunity(cData.community || null);
      setPosts(pData.posts || []);
    }).finally(() => setLoading(false));
  }, [slug]);

  const toggleJoin = async () => {
    if (!community || !isAuthenticated) return;
    setJoining(true);
    const method = community.isMember ? "DELETE" : "POST";
    const endpoint = community.isMember
      ? `${BASE}/api/communities/${slug}/leave`
      : `${BASE}/api/communities/${slug}/join`;
    try {
      const res = await fetch(endpoint, { method, headers: authHeaders });
      if (res.ok) {
        setCommunity(c => c ? {
          ...c,
          isMember: !c.isMember,
          membersCount: c.isMember ? c.membersCount - 1 : c.membersCount + 1,
        } : c);
        toast({ title: community.isMember ? "Left community" : `Joined ${community.name}!` });
      }
    } catch { toast({ title: "Error", variant: "destructive" }); }
    setJoining(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="h-40 bg-card rounded-2xl animate-pulse" />
          <div className="h-64 bg-card rounded-2xl animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (!community) {
    return (
      <Layout>
        <div className="text-center py-20 bg-card rounded-2xl border border-border/50">
          <Globe className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-xl font-bold">Community not found</h2>
          <Link href="/communities"><Button className="mt-4 rounded-full">Browse Communities</Button></Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        {/* Back */}
        <Link href="/communities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-semibold mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Communities
        </Link>

        {/* Community header */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden mb-4 shadow-sm">
          {/* Banner */}
          <div className="h-28 relative"
            style={{ background: `linear-gradient(135deg, ${community.bannerColor}66, ${community.bannerColor})` }}>
            <div className="absolute inset-0 flex items-end px-5 pb-0">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl border-4 border-card mb-[-2rem] bg-card">
                {community.icon}
              </div>
            </div>
            {community.isPrivate && (
              <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-bold text-white bg-black/40 rounded-full px-2 py-1">
                <Lock className="w-3 h-3" /> Private
              </div>
            )}
          </div>

          <div className="px-5 pt-10 pb-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="font-display text-2xl font-bold">{community.name}</h1>
                {community.description && (
                  <p className="text-muted-foreground text-sm mt-1 max-w-lg">{community.description}</p>
                )}
              </div>
              {isAuthenticated && (
                <Button
                  variant={community.isMember ? "outline" : "default"}
                  className="rounded-full px-6 shrink-0"
                  onClick={toggleJoin}
                  isLoading={joining}
                >
                  {community.isMember ? "Joined ✓" : "Join Community"}
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-5 mt-4 pt-4 border-t border-border/30">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <div>
                  <p className="font-bold text-lg leading-none">{formatNumber(community.membersCount)}</p>
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Members</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="font-bold text-lg leading-none">{formatNumber(community.postsCount)}</p>
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Posts</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
            <h2 className="text-xl font-bold mb-2">No posts yet</h2>
            <p className="text-muted-foreground text-sm mb-4">Be the first to post in this community!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        )}
      </motion.div>
    </Layout>
  );
}
