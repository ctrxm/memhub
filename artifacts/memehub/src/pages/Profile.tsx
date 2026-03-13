import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { PostCard } from "@/components/post/PostCard";
import { Avatar, Button } from "@/components/ui/shared";
import { useGetUserProfile, useGetUserPosts, useGetSavedPosts, useFollowUser } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { formatNumber } from "@/lib/utils";
import { Settings, UserPlus, UserMinus, Grid, Bookmark } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'posts'|'saved'>('posts');

  const { data: profile, isLoading } = useGetUserProfile(username || "");
  const isOwner = currentUser?.username === profile?.username;

  const { data: postsData, isLoading: postsLoading } = useGetUserPosts(username || "", {}, { query: { enabled: tab === 'posts' && !!profile } });
  const { data: savedData, isLoading: savedLoading } = useGetSavedPosts({}, { query: { enabled: tab === 'saved' && isOwner } });

  const followMutation = useFollowUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${username}`] });
      }
    }
  });

  if (isLoading) return <Layout><div className="animate-pulse h-64 bg-card rounded-2xl" /></Layout>;
  if (!profile) return <Layout><div className="text-center py-20 font-bold text-2xl">User not found</div></Layout>;

  return (
    <Layout>
      {/* Header */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm mb-6">
        <div className="h-32 bg-gradient-to-r from-primary/80 to-accent" />
        <div className="px-6 pb-6 relative">
          <div className="flex justify-between items-end mb-4">
            <Avatar src={profile.avatar} fallback={profile.username} className="w-24 h-24 sm:w-32 sm:h-32 -mt-12 sm:-mt-16 border-4 border-card bg-card" />
            <div className="flex gap-2">
              {isOwner ? (
                <Button variant="outline" onClick={() => setLocation('/settings')} className="rounded-full">
                  <Settings className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
              ) : (
                <Button 
                  variant={profile.isFollowing ? "outline" : "default"}
                  className="rounded-full px-6"
                  onClick={() => followMutation.mutate({ username: profile.username })}
                  isLoading={followMutation.isPending}
                >
                  {profile.isFollowing ? <><UserMinus className="w-4 h-4 mr-2" /> Unfollow</> : <><UserPlus className="w-4 h-4 mr-2" /> Follow</>}
                </Button>
              )}
            </div>
          </div>
          
          <h1 className="font-display text-3xl font-bold text-foreground">{profile.username}</h1>
          <p className="text-muted-foreground mt-1 max-w-xl">{profile.bio || "This user is too lazy to write a bio."}</p>
          
          <div className="flex flex-wrap gap-6 mt-6">
            <div className="text-center"><p className="font-bold text-xl">{formatNumber(profile.totalPoints)}</p><p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Points</p></div>
            <div className="text-center"><p className="font-bold text-xl">{formatNumber(profile.postsCount)}</p><p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Posts</p></div>
            <div className="text-center"><p className="font-bold text-xl">{formatNumber(profile.followersCount)}</p><p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Followers</p></div>
            <div className="text-center"><p className="font-bold text-xl">{formatNumber(profile.followingCount)}</p><p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Following</p></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border/50 mb-6">
        <button 
          onClick={() => setTab('posts')} 
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${tab === 'posts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Grid className="w-4 h-4" /> Posts
        </button>
        {isOwner && (
          <button 
            onClick={() => setTab('saved')} 
            className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${tab === 'saved' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <Bookmark className="w-4 h-4" /> Saved
          </button>
        )}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {tab === 'posts' && (
          postsLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading posts...</div>
          ) : postsData?.posts?.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-border/50">
              <h2 className="text-xl font-bold mb-2">No posts yet</h2>
              {isOwner && <Button onClick={() => setLocation('/upload')} className="mt-4">Upload a Meme</Button>}
            </div>
          ) : (
            postsData?.posts?.map(post => <PostCard key={post.id} post={post} />)
          )
        )}

        {tab === 'saved' && (
          savedLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading saved posts...</div>
          ) : savedData?.posts?.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-border/50">
              <h2 className="text-xl font-bold mb-2">Nothing saved</h2>
              <p className="text-muted-foreground">You haven't saved any memes yet. Go find some good ones!</p>
            </div>
          ) : (
            savedData?.posts?.map(post => <PostCard key={post.id} post={post} />)
          )
        )}
      </div>
    </Layout>
  );
}
