import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, TrendingUp, Clock, Trophy, Users, Hash, Bell, Settings, ShieldAlert, LogOut, User, PlusCircle, X, Globe } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGetTags } from "@workspace/api-client-react";
import { Avatar, Badge } from "@/components/ui/shared";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MenuDrawer({ open, onClose }: MenuDrawerProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const { data: tagsData } = useGetTags();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const currentSection = searchParams.get("section") || "hot";

  const navTo = (href: string) => { onClose(); window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}${href}`; };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-card border-r border-border/50 shadow-2xl flex flex-col overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <span className="font-display text-xl font-bold">OVR<span className="text-primary">HUB</span></span>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User card (if logged in) */}
            {isAuthenticated && user && (
              <div className="p-4 border-b border-border/30 bg-secondary/30">
                <div className="flex items-center gap-3">
                  <Avatar src={user.avatar} fallback={user.username || "U"} className="w-10 h-10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{user.username}</p>
                    <p className="text-xs text-primary font-semibold">{formatNumber(user.totalPoints || 0)} pts</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => navTo(`/u/${user.username}`)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium transition-colors">
                    <User className="w-4 h-4" /> Profile
                  </button>
                  <button onClick={() => navTo("/upload")} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold transition-colors">
                    <PlusCircle className="w-4 h-4" /> Post
                  </button>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="p-3 flex-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">Discover</p>
              <div className="space-y-0.5 mb-4">
                <DrawerLink active={location === "/" && currentSection === "hot"} icon={<Flame className="w-5 h-5 text-red-500" />} label="Hot" onClick={() => navTo("/")} />
                <DrawerLink active={location === "/" && currentSection === "trending"} icon={<TrendingUp className="w-5 h-5 text-blue-400" />} label="Trending" onClick={() => navTo("/?section=trending")} />
                <DrawerLink active={location === "/" && currentSection === "fresh"} icon={<Clock className="w-5 h-5 text-green-400" />} label="Fresh" onClick={() => navTo("/?section=fresh")} />
                <DrawerLink active={location === "/" && currentSection === "top"} icon={<Trophy className="w-5 h-5 text-yellow-500" />} label="Top" onClick={() => navTo("/?section=top")} />
                {isAuthenticated && (
                  <DrawerLink active={location === "/" && currentSection === "following"} icon={<Users className="w-5 h-5 text-purple-400" />} label="Following" onClick={() => navTo("/?section=following")} />
                )}
              </div>

              {isAuthenticated && (
                <>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">You</p>
                  <div className="space-y-0.5 mb-4">
                    <DrawerLink active={location === "/notifications"} icon={<Bell className="w-5 h-5 text-orange-400" />} label="Notifications" onClick={() => navTo("/notifications")} />
                    <DrawerLink active={location === "/settings"} icon={<Settings className="w-5 h-5" />} label="Settings" onClick={() => navTo("/settings")} />
                    {user?.role === "admin" && (
                      <DrawerLink active={location === "/admin"} icon={<ShieldAlert className="w-5 h-5 text-primary" />} label="Admin Panel" onClick={() => navTo("/admin")} />
                    )}
                  </div>
                </>
              )}

              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">Communities</p>
              <div className="space-y-0.5 mb-4">
                <DrawerLink active={location === "/communities"} icon={<Globe className="w-5 h-5 text-cyan-400" />} label="All Communities" onClick={() => navTo("/communities")} />
              </div>

              {tagsData?.tags && tagsData.tags.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">Popular Tags</p>
                  <div className="flex flex-wrap gap-1.5 px-2 mb-4">
                    {tagsData.tags.slice(0, 12).map(tag => (
                      <button key={tag.id} onClick={() => navTo(`/tag/${tag.slug}`)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors">
                        #{tag.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Logout */}
            {isAuthenticated && (
              <div className="p-3 border-t border-border/30">
                <button
                  onClick={() => { logout(); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 font-bold transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerLink({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all text-left",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {icon} {label}
    </button>
  );
}
