import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button, Avatar } from "@/components/ui/shared";
import { Bell, User, LogOut, Settings, ShieldAlert, Zap, Menu } from "lucide-react";
import { useState } from "react";
import { useGetNotifications } from "@workspace/api-client-react";
import { OvrHubLogoIcon } from "@/components/ui/OvrHubLogo";
import { MenuDrawer } from "./MenuDrawer";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: notifs } = useGetNotifications({}, {
    query: { enabled: isAuthenticated, refetchInterval: 30000 }
  });

  const unreadCount = notifs?.unreadCount || 0;

  return (
    <>
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <header className="sticky top-0 z-40 w-full glass-panel">
        <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-4">

          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <OvrHubLogoIcon size={32} className="rounded-lg" />
              <span className="font-display text-2xl font-bold tracking-tight hidden sm:block text-foreground">
                OVR<span className="text-primary">HUB</span>
              </span>
            </Link>
          </div>

          {/* Right: Notifications + User */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isAuthenticated ? (
              <>
                <Link href="/notifications" className="relative group">
                  <Button variant="ghost" size="icon" className="relative text-muted-foreground group-hover:text-foreground">
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-primary ring-2 ring-background animate-pulse" />
                    )}
                  </Button>
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="focus:outline-none transition-transform active:scale-95"
                  >
                    <Avatar src={user?.avatar} fallback={user?.username || "U"} className="border-2 border-transparent hover:border-primary transition-colors" />
                  </button>

                  {showDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                      <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-popover border border-border shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-border/50 bg-secondary/30">
                          <p className="font-bold text-foreground truncate">{user?.username}</p>
                          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                          <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
                            <Zap className="w-3 h-3" /> {user?.totalPoints || 0} Points
                          </div>
                        </div>
                        <div className="p-2 flex flex-col gap-1">
                          <button onClick={() => { setLocation(`/u/${user?.username}`); setShowDropdown(false); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary text-sm font-medium transition-colors w-full text-left">
                            <User className="w-4 h-4" /> Profile
                          </button>
                          <button onClick={() => { setLocation("/settings"); setShowDropdown(false); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary text-sm font-medium transition-colors w-full text-left">
                            <Settings className="w-4 h-4" /> Settings
                          </button>
                          {user?.role === "admin" && (
                            <button onClick={() => { setLocation("/admin"); setShowDropdown(false); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/10 text-primary text-sm font-medium transition-colors w-full text-left">
                              <ShieldAlert className="w-4 h-4" /> Admin Panel
                            </button>
                          )}
                          <hr className="my-1 border-border/50" />
                          <button onClick={() => { logout(); setShowDropdown(false); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive text-sm font-medium transition-colors w-full text-left">
                            <LogOut className="w-4 h-4" /> Logout
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setLocation("/login")} className="hidden sm:inline-flex font-bold">
                  Log in
                </Button>
                <Button onClick={() => setLocation("/register")} className="rounded-full font-bold px-6">
                  Sign up
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
