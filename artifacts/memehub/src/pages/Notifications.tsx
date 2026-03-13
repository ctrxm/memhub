import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Avatar, Button } from "@/components/ui/shared";
import { useGetNotifications } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, MessageSquare, UserPlus, ArrowBigUp, Check } from "lucide-react";
import { formatTimeAgo, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const notifIcons: Record<string, React.ReactNode> = {
  upvote: <ArrowBigUp className="w-4 h-4 text-[hsl(var(--upvote))]" />,
  comment: <MessageSquare className="w-4 h-4 text-blue-400" />,
  follow: <UserPlus className="w-4 h-4 text-green-400" />,
  reply: <MessageSquare className="w-4 h-4 text-purple-400" />,
  mention: <Bell className="w-4 h-4 text-yellow-400" />,
};

export default function Notifications() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetNotifications({}, {
    query: { enabled: isAuthenticated }
  });

  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const markAllRead = async () => {
    setIsMarkingRead(true);
    try {
      await fetch(`${BASE}/api/notifications/read`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "All notifications marked as read" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
    setIsMarkingRead(false);
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="text-center py-20 bg-card rounded-2xl border border-border/50">
          <Bell className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h2 className="text-2xl font-bold mb-2">Login to see notifications</h2>
          <Button className="mt-4 rounded-full" onClick={() => setLocation("/login")}>Log in</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideSidebar>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Bell className="w-7 h-7 text-primary" /> Notifications
            {(data?.unreadCount || 0) > 0 && (
              <span className="bg-primary text-primary-foreground text-sm font-bold px-2.5 py-1 rounded-full">
                {data?.unreadCount}
              </span>
            )}
          </h1>
          {(data?.unreadCount || 0) > 0 && (
            <Button variant="ghost" size="sm" className="gap-2 font-bold" onClick={markAllRead} isLoading={isMarkingRead}>
              <Check className="w-4 h-4" /> Mark all read
            </Button>
          )}
        </div>

        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="space-y-1 p-4">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 rounded-xl bg-secondary/40 animate-pulse" />)}
            </div>
          ) : !data?.notifications?.length ? (
            <div className="text-center py-20">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <h2 className="text-lg font-bold text-foreground mb-1">All caught up!</h2>
              <p className="text-muted-foreground text-sm">No notifications yet. Go post some memes!</p>
            </div>
          ) : (
            <div>
              {data.notifications.map(notif => (
                <div
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-4 p-4 border-b border-border/30 hover:bg-secondary/30 transition-colors cursor-pointer last:border-b-0",
                    !notif.isRead && "bg-primary/5 hover:bg-primary/10"
                  )}
                  onClick={() => notif.postId && setLocation(`/post/${notif.postId}`)}
                >
                  <div className="relative shrink-0">
                    <Avatar src={notif.fromUser?.avatar} fallback={notif.fromUser?.username || "?"} className="w-10 h-10" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center">
                      {notifIcons[notif.type] || <Bell className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      <span className="font-bold">{notif.fromUser?.username}</span> {notif.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(notif.createdAt)}</p>
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
