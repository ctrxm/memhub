import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Post, useVotePost, useSavePost } from "@workspace/api-client-react";
import { Avatar, Badge, Button } from "@/components/ui/shared";
import { ArrowBigUp, ArrowBigDown, MessageSquare, Share2, Bookmark, MoreHorizontal, Trash2, Flag, Copy, Zap } from "lucide-react";
import { UserBadges } from "@/components/ui/UserBadge";
import { formatTimeAgo, cn, formatNumber } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { OvrHubLogoIcon } from "@/components/ui/OvrHubLogo";
import { TipModal } from "@/components/tip/TipModal";

export function PostCard({ post, isDetail = false }: { post: Post, isDetail?: boolean }) {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [authorTipsEnabled, setAuthorTipsEnabled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    const authorId = (post.author as any).id;
    if (!authorId) return;
    fetch(`${BASE}/api/tips/post/${post.id}/author`)
      .then(r => r.json())
      .then(d => setAuthorTipsEnabled(!!d.tipsEnabled))
      .catch(() => {});
  }, [post.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    if (showMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const voteMutation = useVotePost({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
        queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}`] });
      },
      onError: () => toast({ title: "Error", description: "Could not record vote", variant: "destructive" }),
    },
  });

  const saveMutation = useSavePost({
    mutation: {
      onSuccess: () => {
        toast({ title: post.isSaved ? "Removed from saved" : "Saved to your profile!" });
        queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
        queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}`] });
      },
    },
  });

  const handleVote = (direction: "up" | "down") => {
    if (!isAuthenticated) return toast({ title: "Login required", description: "Please log in to vote." });
    voteMutation.mutate({ id: post.id, data: { direction } });
  };

  const handleShare = () => {
    const url = `${window.location.origin}${BASE}/post/${post.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    toast({ title: "Link copied to clipboard!" });
    setShowMenu(false);
  };

  const handleReport = async () => {
    if (!isAuthenticated) return toast({ title: "Login required" });
    setShowMenu(false);
    try {
      await fetch(`${BASE}/api/posts/${post.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "spam" }),
      });
      toast({ title: "Reported", description: "Our moderators will review this post." });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    if (!confirm("Delete this post? This cannot be undone.")) return;
    try {
      const res = await fetch(`${BASE}/api/posts/${post.id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Post deleted" });
        queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
        if (isDetail) setLocation("/");
      } else {
        toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const isOwner = user && String(user.id) === String(post.author.id);
  const isAdmin = user?.role === "admin";
  const ContentWrapper = isDetail ? "div" : Link;
  const contentProps = isDetail ? {} : { href: `/post/${post.id}` };

  return (
    <article className={cn("bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm", !isDetail && "card-hover mb-6")}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/u/${post.author.username}`}>
            <Avatar src={post.author.avatar} fallback={post.author.username} className="cursor-pointer hover:ring-2 hover:ring-primary transition-all" />
          </Link>
          <div>
            <span className="flex items-center gap-1.5">
              <Link href={`/u/${post.author.username}`} className="font-bold text-foreground hover:underline">
                {post.author.username}
              </Link>
              <UserBadges badges={(post.author as any).badges} size="sm" max={3} />
            </span>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              {formatTimeAgo(post.createdAt)}
              {post.type === "gif" && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">GIF</Badge>}
            </p>
          </div>
        </div>

        {/* More menu */}
        <div className="relative" ref={menuRef}>
          <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full" onClick={() => setShowMenu(v => !v)}>
            <MoreHorizontal className="w-5 h-5" />
          </Button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-48 rounded-2xl bg-popover border border-border shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 py-1">
              <button onClick={handleShare} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors">
                <Copy className="w-4 h-4" /> Copy Link
              </button>
              {isAuthenticated && !isOwner && (
                <button onClick={handleReport} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors text-orange-400">
                  <Flag className="w-4 h-4" /> Report
                </button>
              )}
              {(isOwner || isAdmin) && (
                <button onClick={handleDelete} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors text-destructive">
                  <Trash2 className="w-4 h-4" /> Delete Post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title + Tags */}
      <div className="px-4 pb-3">
        <ContentWrapper {...(contentProps as any)} className={cn("block", !isDetail && "cursor-pointer")}>
          <h2 className="font-display text-xl sm:text-2xl font-bold leading-tight text-foreground hover:text-primary transition-colors">
            {post.title}
          </h2>
        </ContentWrapper>
        {post.community && (
          <div className="mt-1.5">
            <Link href={`/c/${post.community.slug}`}>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary/80 hover:text-primary transition-colors bg-primary/10 hover:bg-primary/15 px-2 py-0.5 rounded-full cursor-pointer">
                {post.community.icon} {post.community.name}
              </span>
            </Link>
          </div>
        )}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {post.tags.map(tag => (
              <Link key={tag.id} href={`/tag/${tag.slug}`}>
                <span className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer">#{tag.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Media */}
      <ContentWrapper {...(contentProps as any)} className={cn("block relative bg-black/20 group", !isDetail && "cursor-pointer")}>
        <div className={cn("relative w-full flex justify-center items-center overflow-hidden", !isImageLoaded && "min-h-[300px] bg-muted")}>
          {!isImageLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 animate-pulse">
              <OvrHubLogoIcon size={48} className="opacity-20" />
            </div>
          )}
          <img
            src={post.type === "gif" && post.gifUrl ? post.gifUrl : post.imageUrl}
            alt={post.title}
            className={cn("max-h-[700px] w-full object-contain transition-opacity duration-500", isImageLoaded ? "opacity-100" : "opacity-0")}
            onLoad={() => setIsImageLoaded(true)}
            onError={() => setIsImageLoaded(true)}
            loading="lazy"
          />
        </div>
      </ContentWrapper>

      {/* Action Bar */}
      <div className="p-2 px-4 flex items-center justify-between border-t border-border/30 bg-secondary/10">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center bg-secondary/50 rounded-full p-1 border border-border/50">
            <button
              onClick={() => handleVote("up")}
              disabled={voteMutation.isPending}
              className={cn("p-1.5 rounded-full transition-colors", post.userVote === "up" ? "bg-[hsl(var(--upvote))] text-white" : "hover:bg-[hsl(var(--upvote))/20] hover:text-[hsl(var(--upvote))] text-muted-foreground")}
            >
              <ArrowBigUp className="w-6 h-6 sm:w-7 sm:h-7" fill={post.userVote === "up" ? "currentColor" : "none"} />
            </button>
            <span className={cn("font-bold text-sm sm:text-base px-2 w-12 text-center select-none", post.points > 0 ? "text-[hsl(var(--upvote))]" : post.points < 0 ? "text-[hsl(var(--downvote))]" : "")}>
              {formatNumber(post.points)}
            </span>
            <button
              onClick={() => handleVote("down")}
              disabled={voteMutation.isPending}
              className={cn("p-1.5 rounded-full transition-colors", post.userVote === "down" ? "bg-[hsl(var(--downvote))] text-white" : "hover:bg-[hsl(var(--downvote))/20] hover:text-[hsl(var(--downvote))] text-muted-foreground")}
            >
              <ArrowBigDown className="w-6 h-6 sm:w-7 sm:h-7" fill={post.userVote === "down" ? "currentColor" : "none"} />
            </button>
          </div>
          <Link href={`/post/${post.id}#comments`}>
            <Button variant="ghost" className="rounded-full gap-2 text-muted-foreground hover:text-foreground font-bold">
              <MessageSquare className="w-5 h-5" />
              <span>{formatNumber(post.commentsCount)}</span>
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          {!isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full gap-1.5 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 font-bold px-3"
              onClick={() => {
                if (!isAuthenticated) return toast({ title: "Login required", description: "Log in to send tips." });
                if (!authorTipsEnabled) return toast({ title: "Tips not available", description: "This creator hasn't enabled the tip feature yet." });
                setShowTipModal(true);
              }}
            >
              <Zap className="w-4 h-4" fill="currentColor" />
              <span className="text-xs">Tip</span>
            </Button>
          )}
          <Button
            variant="ghost" size="icon"
            className={cn("rounded-full", post.isSaved ? "text-primary" : "text-muted-foreground hover:text-primary")}
            onClick={() => isAuthenticated ? saveMutation.mutate({ id: post.id }) : toast({ title: "Login required" })}
            disabled={saveMutation.isPending}
          >
            <Bookmark className="w-5 h-5" fill={post.isSaved ? "currentColor" : "none"} />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground" onClick={handleShare}>
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {showTipModal && (
        <TipModal
          toUserId={String(post.author.id)}
          toUsername={post.author.username}
          postId={post.id}
          onClose={() => setShowTipModal(false)}
        />
      )}
    </article>
  );
}
