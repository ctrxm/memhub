import { useState } from "react";
import { useParams } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { PostCard } from "@/components/post/PostCard";
import { Avatar, Button, Textarea } from "@/components/ui/shared";
import { useGetPost, useGetComments, useCreateComment, useVoteComment, Comment as CommentType } from "@workspace/api-client-react";
import { formatTimeAgo, formatNumber, cn } from "@/lib/utils";
import { ArrowBigUp, ArrowBigDown, Loader2, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function PostDetail() {
  const { id } = useParams();
  const { data: post, isLoading: isPostLoading, isError } = useGetPost(id || "");
  const { data: commentsData, isLoading: isCommentsLoading } = useGetComments(id || "");
  
  if (isPostLoading) return <Layout><div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div></Layout>;
  if (isError || !post) return <Layout><div className="text-center py-20"><h1 className="text-2xl font-bold">Post not found</h1></div></Layout>;

  return (
    <Layout>
      <div className="mb-8">
        <PostCard post={post} isDetail={true} />
      </div>

      <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm" id="comments">
        <h3 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          Comments <span className="bg-secondary text-secondary-foreground text-sm py-1 px-3 rounded-full">{formatNumber(post.commentsCount)}</span>
        </h3>
        
        <CommentForm postId={post.id} />

        <div className="mt-8 space-y-6">
          {isCommentsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : commentsData?.comments?.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No comments yet. Be the first to ruin the silence.</p>
          ) : (
            commentsData?.comments?.map(comment => (
              <CommentThread key={comment.id} comment={comment} postId={post.id} />
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

function CommentForm({ postId, parentId, onCancel }: { postId: string, parentId?: string, onCancel?: () => void }) {
  const [content, setContent] = useState("");
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useCreateComment({
    mutation: {
      onSuccess: () => {
        setContent("");
        queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}/comments`] });
        queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}`] });
        if (onCancel) onCancel();
        toast({ title: "Comment posted!" });
      },
      onError: (err) => {
        toast({ title: "Failed to post", description: err?.message, variant: "destructive" });
      }
    }
  });

  const handleSubmit = () => {
    if (!isAuthenticated) return toast({ title: "Login required" });
    if (!content.trim()) return;
    createMutation.mutate({ id: postId, data: { content, parentId: parentId || null } });
  };

  return (
    <div className="flex gap-4">
      <div className="flex-1 space-y-3">
        <Textarea 
          placeholder="Leave a comment..." 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[80px] bg-secondary/30 focus-visible:bg-background"
        />
        <div className="flex justify-end gap-2">
          {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
          <Button 
            onClick={handleSubmit} 
            isLoading={createMutation.isPending}
            disabled={!content.trim()}
            className="gap-2 rounded-full"
          >
            <Send className="w-4 h-4" /> Post
          </Button>
        </div>
      </div>
    </div>
  );
}

function CommentThread({ comment, postId }: { comment: CommentType, postId: string }) {
  const [isReplying, setIsReplying] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const voteMutation = useVoteComment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}/comments`] });
      }
    }
  });

  const handleVote = (direction: 'up'|'down') => {
    if (!isAuthenticated) return toast({ title: "Login required" });
    voteMutation.mutate({ id: comment.id, data: { direction } });
  };

  return (
    <div className="flex gap-3">
      <Avatar src={comment.author.avatar} fallback={comment.author.username} className="w-8 h-8" />
      <div className="flex-1">
        <div className="bg-secondary/40 rounded-2xl rounded-tl-none px-4 py-3 border border-border/30">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm text-foreground">{comment.author.username}</span>
            <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
        </div>
        
        <div className="flex items-center gap-4 mt-2 px-2 text-sm text-muted-foreground font-semibold">
          <div className="flex items-center gap-1">
            <button onClick={() => handleVote('up')} className={cn("hover:text-[hsl(var(--upvote))] transition-colors", comment.userVote === 'up' && "text-[hsl(var(--upvote))]")}>
              <ArrowBigUp className="w-5 h-5" fill={comment.userVote === 'up' ? "currentColor" : "none"} />
            </button>
            <span>{formatNumber(comment.upvotes - comment.downvotes)}</span>
            <button onClick={() => handleVote('down')} className={cn("hover:text-[hsl(var(--downvote))] transition-colors", comment.userVote === 'down' && "text-[hsl(var(--downvote))]")}>
              <ArrowBigDown className="w-5 h-5" fill={comment.userVote === 'down' ? "currentColor" : "none"} />
            </button>
          </div>
          <button onClick={() => setIsReplying(!isReplying)} className="hover:text-foreground transition-colors">Reply</button>
        </div>

        {isReplying && (
          <div className="mt-4 mb-4">
            <CommentForm postId={postId} parentId={comment.id} onCancel={() => setIsReplying(false)} />
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 space-y-4 border-l-2 border-border/50 pl-4 ml-2">
            {comment.replies.map(reply => (
              <CommentThread key={reply.id} comment={reply} postId={postId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
