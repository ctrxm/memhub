import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { PostCard } from "@/components/post/PostCard";
import { Button } from "@/components/ui/shared";
import { Hash, Loader2, TrendingUp } from "lucide-react";

export default function TagPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [tag, setTag] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const fetchPosts = async (p: number, append = false) => {
    if (p === 1) setIsLoading(true); else setIsFetching(true);
    try {
      const res = await fetch(`${BASE}/api/tags/${slug}/posts?page=${p}`);
      const data = await res.json();
      if (data.tag) setTag(data.tag);
      setAllPosts(prev => append ? [...prev, ...(data.posts || [])] : (data.posts || []));
      setHasMore(data.hasMore || false);
    } catch {}
    setIsLoading(false);
    setIsFetching(false);
  };

  useEffect(() => {
    fetchPosts(1);
  }, [slug]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(next, true);
  };

  return (
    <Layout>
      <div className="mb-8 bg-card border border-border/50 rounded-2xl p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Hash className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            #{tag?.name || slug}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <TrendingUp className="w-4 h-4" />
            {tag?.postsCount ? `${tag.postsCount.toLocaleString()} posts` : "Loading..."}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => <div key={i} className="bg-card rounded-2xl h-80 animate-pulse border border-border/50" />)}
        </div>
      ) : allPosts.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border/50">
          <Hash className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h2 className="text-xl font-bold mb-2">No memes in this tag yet</h2>
          <p className="text-muted-foreground">Be the first to post something tagged #{slug}!</p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {allPosts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
          {hasMore && (
            <div className="mt-8 mb-12 flex justify-center">
              <Button size="lg" variant="secondary" onClick={handleLoadMore} isLoading={isFetching} className="rounded-full px-12 font-bold">
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
