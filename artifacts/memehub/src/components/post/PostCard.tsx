import { useState } from "react";
import { Link } from "wouter";
import { Post, useVotePost, useSavePost, getGetPostsQueryKey } from "@workspace/api-client-react";
import { Avatar, Badge, Button } from "@/components/ui/shared";
import { ArrowBigUp, ArrowBigDown, MessageSquare, Share2, Bookmark, MoreHorizontal } from "lucide-react";
import { formatTimeAgo, cn, formatNumber } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export function PostCard({ post, isDetail = false }: { post: Post, isDetail?: boolean }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const voteMutation = useVotePost({
    mutation: {
      onMutate: async (variables) => {
        // Simple optimistic update strategy: invalidate immediately or just let the mutation return data update it if we handled specific queries.
        // For robustness without deep cache traversal, we just invalidate after.
      },
      onSuccess: () => {
        // Invalidate relevant queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
        queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}`] });
      },
      onError: () => {
        toast({ title: "Error", description: "Could not record vote", variant: "destructive" });
      }
    }
  });

  const saveMutation = useSavePost({
    mutation: {
      onSuccess: () => {
        toast({ title: post.isSaved ? "Post unsaved" : "Post saved to profile" });
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
        queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}`] });
      }
    }
  });

  const handleVote = (direction: 'up' | 'down') => {
    if (!isAuthenticated) return toast({ title: "Login required", description: "Please login to vote." });
    // If clicking same direction, it acts as an unvote (assuming API handles this, but usually sending same toggles it or API expects it. The spec has VoteRequestDirection).
    voteMutation.mutate({ id: post.id, data: { direction } });
  };

  const handleShare = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard!" });
  };

  const ContentWrapper = isDetail ? 'div' : Link;
  const contentProps = isDetail ? {} : { href: `/post/${post.id}` };

  return (
    <article className={cn(
      "bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm",
      !isDetail && "card-hover mb-6"
    )}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/u/${post.author.username}`}>
            <Avatar src={post.author.avatar} fallback={post.author.username} className="cursor-pointer hover:ring-2 hover:ring-primary transition-all" />
          </Link>
          <div>
            <Link href={`/u/${post.author.username}`} className="font-bold text-foreground hover:underline">
              {post.author.username}
            </Link>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              {formatTimeAgo(post.createdAt)}
              {post.type === 'gif' && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">GIF</Badge>}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {/* Title */}
      <div className="px-4 pb-3">
        <ContentWrapper {...contentProps as any} className={cn("block", !isDetail && "cursor-pointer")}>
          <h2 className="font-display text-xl sm:text-2xl font-bold leading-tight text-foreground hover:text-primary transition-colors">
            {post.title}
          </h2>
        </ContentWrapper>
        
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {post.tags.map(tag => (
              <Link key={tag.id} href={`/tag/${tag.slug}`}>
                <span className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                  #{tag.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Media */}
      <ContentWrapper {...contentProps as any} className="block relative bg-black/20 group cursor-pointer">
        <div className={cn("relative w-full flex justify-center items-center overflow-hidden", !isImageLoaded && "min-h-[300px] animate-pulse bg-muted")}>
          <img 
            src={post.type === 'gif' && post.gifUrl ? post.gifUrl : post.imageUrl} 
            alt={post.title}
            className={cn("max-h-[700px] w-full object-contain transition-opacity duration-500", isImageLoaded ? "opacity-100" : "opacity-0")}
            onLoad={() => setIsImageLoaded(true)}
            loading="lazy"
          />
        </div>
      </ContentWrapper>

      {/* Action Bar */}
      <div className="p-2 px-4 flex items-center justify-between border-t border-border/30 bg-secondary/10">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Vote Buttons Group */}
          <div className="flex items-center bg-secondary/50 rounded-full p-1 border border-border/50">
            <button 
              onClick={() => handleVote('up')}
              className={cn("p-1.5 rounded-full transition-colors", post.userVote === 'up' ? "bg-[hsl(var(--upvote))] text-white" : "hover:bg-[hsl(var(--upvote))/20] hover:text-[hsl(var(--upvote))] text-muted-foreground")}
            >
              <ArrowBigUp className="w-6 h-6 sm:w-7 sm:h-7" fill={post.userVote === 'up' ? "currentColor" : "none"} />
            </button>
            <span className="font-bold text-sm sm:text-base px-2 w-12 text-center select-none">{formatNumber(post.points)}</span>
            <button 
              onClick={() => handleVote('down')}
              className={cn("p-1.5 rounded-full transition-colors", post.userVote === 'down' ? "bg-[hsl(var(--downvote))] text-white" : "hover:bg-[hsl(var(--downvote))/20] hover:text-[hsl(var(--downvote))] text-muted-foreground")}
            >
              <ArrowBigDown className="w-6 h-6 sm:w-7 sm:h-7" fill={post.userVote === 'down' ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Comments */}
          <Link href={`/post/${post.id}#comments`}>
            <Button variant="ghost" className="rounded-full gap-2 text-muted-foreground hover:text-foreground">
              <MessageSquare className="w-5 h-5" />
              <span className="font-bold">{formatNumber(post.commentsCount)}</span>
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className={cn("rounded-full", post.isSaved ? "text-primary" : "text-muted-foreground")} onClick={() => isAuthenticated ? saveMutation.mutate({ id: post.id }) : toast({ title: "Login required" })}>
            <Bookmark className="w-5 h-5" fill={post.isSaved ? "currentColor" : "none"} />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" onClick={handleShare}>
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </article>
  );
}
