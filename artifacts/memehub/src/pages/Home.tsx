import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { PostCard } from "@/components/post/PostCard";
import { Button } from "@/components/ui/shared";
import { useGetPosts, GetPostsSection } from "@workspace/api-client-react";
import { Loader2, Zap } from "lucide-react";

export default function Home() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sectionQuery = searchParams.get('section') as GetPostsSection || 'hot';
  const [page, setPage] = useState(1);

  // Use the generated hook to fetch posts
  const { data, isLoading, isError, isFetching } = useGetPosts({
    section: sectionQuery,
    page: page,
    limit: 10
  }, {
    query: { keepPreviousData: true } // keep data while fetching next page for smooth UX
  });

  const handleLoadMore = () => {
    if (data?.hasMore) {
      setPage(p => p + 1);
    }
  };

  return (
    <Layout>
      {/* Mobile Tabs - Desktop has sidebar */}
      <div className="lg:hidden flex overflow-x-auto gap-2 mb-6 pb-2 scrollbar-hide">
        <TabLink active={sectionQuery === 'hot'} href="/">Hot</TabLink>
        <TabLink active={sectionQuery === 'trending'} href="/?section=trending">Trending</TabLink>
        <TabLink active={sectionQuery === 'fresh'} href="/?section=fresh">Fresh</TabLink>
        <TabLink active={sectionQuery === 'top'} href="/?section=top">Top</TabLink>
      </div>

      {isLoading && page === 1 ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-2xl h-96 animate-pulse border border-border/50" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border/50">
          <Zap className="w-12 h-12 text-destructive mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Oops, something broke!</h2>
          <p className="text-muted-foreground mb-6">Failed to load memes. The server monkeys are on it.</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      ) : data?.posts?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border/50">
          <h2 className="text-2xl font-bold text-foreground mb-2">It's quiet... too quiet.</h2>
          <p className="text-muted-foreground">No posts found for this section.</p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {data?.posts?.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {data?.hasMore && (
            <div className="mt-8 mb-12 flex justify-center">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={handleLoadMore}
                isLoading={isFetching}
                className="w-full sm:w-auto font-bold rounded-full px-12"
              >
                Load More Memes
              </Button>
            </div>
          )}
          
          {!data?.hasMore && data?.posts && data.posts.length > 0 && (
            <div className="text-center py-8 text-muted-foreground font-medium">
              You've reached the end of the internet. Go touch grass.
            </div>
          )}
        </>
      )}
    </Layout>
  );
}

function TabLink({ active, href, children }: { active: boolean, href: string, children: React.ReactNode }) {
  return (
    <Button 
      variant={active ? "default" : "secondary"} 
      className={`rounded-full px-6 font-bold whitespace-nowrap ${active ? 'shadow-primary/20 shadow-lg' : ''}`}
      onClick={() => window.location.href = href}
    >
      {children}
    </Button>
  );
}
