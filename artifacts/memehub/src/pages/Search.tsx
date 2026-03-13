import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { PostCard } from "@/components/post/PostCard";
import { useSearchPosts } from "@workspace/api-client-react";
import { Search as SearchIcon, Loader2 } from "lucide-react";

export default function Search() {
  const searchParams = new URLSearchParams(window.location.search);
  const q = searchParams.get('q') || '';

  const { data, isLoading } = useSearchPosts({ q }, { query: { enabled: !!q } });

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <SearchIcon className="text-muted-foreground" />
          Search results for "<span className="text-primary">{q}</span>"
        </h1>
        <p className="text-muted-foreground mt-1">Found {data?.total || 0} memes matching your query.</p>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : data?.posts?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border/50">
            <h2 className="text-xl font-bold mb-2">No results found</h2>
            <p className="text-muted-foreground">Try searching for something else or check your spelling.</p>
          </div>
        ) : (
          data?.posts?.map(post => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </Layout>
  );
}
