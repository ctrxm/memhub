import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { PostCard } from "@/components/post/PostCard";
import { Avatar, Button } from "@/components/ui/shared";
import { useGetUserProfile, useGetUserPosts, useGetSavedPosts, useFollowUser } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { formatNumber } from "@/lib/utils";
import { Settings, UserPlus, UserMinus, Grid, Bookmark, Zap, Trophy, Users, Calendar } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { UserBadge } from "@/components/ui/UserBadge";

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"posts" | "saved">("posts");

  const { data: profile, isLoading } = useGetUserProfile(username || "");
  const isOwner = currentUser?.username === profile?.username;

  const { data: postsData, isLoading: postsLoading } = useGetUserPosts(username || "", {}, {
    query: { enabled: tab === "posts" && !!profile },
  });
  const { data: savedData, isLoading: savedLoading } = useGetSavedPosts({}, {
    query: { enabled: tab === "saved" && isOwner },
  });

  const followMutation = useFollowUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${username}`] });
      },
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="h-48 bg-card rounded-2xl animate-pulse" />
          <div className="h-32 bg-card rounded-2xl animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="text-center py-20 font-bold text-2xl">User not found</div>
      </Layout>
    );
  }

  const badges = (profile as any).badges ?? [];
  const joinDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>

        {/* Banner + Avatar card */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg mb-4">
          {/* Gradient Banner */}
          <div
            className="relative h-36 sm:h-44 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(25,100%,30%) 0%, hsl(25,100%,50%) 40%, hsl(220,80%,50%) 100%)",
            }}
          >
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                  radial-gradient(circle at 80% 20%, white 1px, transparent 1px),
                  radial-gradient(circle at 60% 80%, white 1px, transparent 1px)`,
                backgroundSize: "60px 60px",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-end pr-6 select-none pointer-events-none">
              <span className="font-meme text-6xl sm:text-8xl text-white/10 leading-none">
                {profile.username.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Profile info */}
          <div className="px-5 pb-5 relative">
            <div className="flex justify-between items-end -mt-10 sm:-mt-14 mb-4">
              <div className="relative">
                <Avatar
                  src={profile.avatar}
                  fallback={profile.username}
                  className="w-20 h-20 sm:w-28 sm:h-28 border-4 border-card shadow-2xl ring-2 ring-primary/30"
                />
                {profile.role === "admin" && (
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg">A</span>
                )}
                {profile.role === "moderator" && (
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg">M</span>
                )}
              </div>
              <div className="flex gap-2 pb-1">
                {isOwner ? (
                  <Button variant="outline" onClick={() => setLocation("/settings")} className="rounded-full text-sm">
                    <Settings className="w-4 h-4 mr-2" /> Edit Profile
                  </Button>
                ) : (
                  <Button
                    variant={profile.isFollowing ? "outline" : "default"}
                    className="rounded-full px-5 text-sm"
                    onClick={() => followMutation.mutate({ username: profile.username })}
                    isLoading={followMutation.isPending}
                  >
                    {profile.isFollowing ? (
                      <><UserMinus className="w-4 h-4 mr-2" /> Unfollow</>
                    ) : (
                      <><UserPlus className="w-4 h-4 mr-2" /> Follow</>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-none">
                {profile.username}
              </h1>
              {badges.length > 0 && (
                <span className="flex items-center gap-1">
                  {badges.map((b: any) => (
                    <UserBadge key={b.id} badge={b} size="md" />
                  ))}
                </span>
              )}
            </div>

            <p className="text-muted-foreground text-sm mt-2 max-w-lg leading-relaxed">
              {profile.bio || "This user is too lazy to write a bio."}
            </p>

            {joinDate && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                <Calendar className="w-3.5 h-3.5" /> Joined {joinDate}
              </p>
            )}

            <div className="flex flex-wrap gap-5 mt-5 pt-5 border-t border-border/30">
              <StatItem icon={<Zap className="w-4 h-4 text-primary" />} value={profile.totalPoints} label="Points" />
              <StatItem icon={<Grid className="w-4 h-4 text-blue-400" />} value={profile.postsCount} label="Posts" />
              <StatItem icon={<Users className="w-4 h-4 text-purple-400" />} value={profile.followersCount} label="Followers" />
              <StatItem icon={<Trophy className="w-4 h-4 text-yellow-400" />} value={profile.followingCount} label="Following" />
            </div>
          </div>
        </div>

        {/* Badges showcase */}
        {badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border/50 rounded-2xl p-4 mb-4 shadow-sm"
          >
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Badges</p>
            <div className="flex flex-wrap gap-3">
              {badges.map((badge: any) => (
                <div key={badge.id} className="flex items-center gap-2 bg-secondary/50 rounded-xl px-3 py-2 border border-border/30">
                  <UserBadge badge={badge} size="md" showTooltip={false} />
                  <div>
                    <p className="text-sm font-bold leading-none" style={{ color: badge.color }}>{badge.name}</p>
                    {badge.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{badge.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-secondary/50 rounded-xl p-1">
          <TabBtn active={tab === "posts"} onClick={() => setTab("posts")} icon={<Grid className="w-4 h-4" />} label="Posts" count={profile.postsCount} />
          {isOwner && (
            <TabBtn active={tab === "saved"} onClick={() => setTab("saved")} icon={<Bookmark className="w-4 h-4" />} label="Saved" />
          )}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "posts" && (
              postsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => <div key={i} className="h-64 bg-card rounded-2xl animate-pulse" />)}
                </div>
              ) : postsData?.posts?.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
                  <h2 className="text-xl font-bold mb-2">No posts yet</h2>
                  {isOwner && (
                    <Button onClick={() => setLocation("/upload")} className="mt-4 rounded-full px-8">
                      Upload Your First Meme
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {postsData?.posts?.map(post => <PostCard key={post.id} post={post} />)}
                </div>
              )
            )}

            {tab === "saved" && (
              savedLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => <div key={i} className="h-64 bg-card rounded-2xl animate-pulse" />)}
                </div>
              ) : savedData?.posts?.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
                  <h2 className="text-xl font-bold mb-2">Nothing saved</h2>
                  <p className="text-muted-foreground text-sm">You haven{"'"}t saved any memes yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedData?.posts?.map(post => <PostCard key={post.id} post={post} />)}
                </div>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </Layout>
  );
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="font-bold text-lg leading-none">{formatNumber(value)}</p>
        <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

function TabBtn({
  active, onClick, icon, label, count,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
        active ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon} {label}
      {count !== undefined && (
        <span className={`text-xs rounded-full px-1.5 py-0.5 ${active ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
          {formatNumber(count)}
        </span>
      )}
    </button>
  );
}
