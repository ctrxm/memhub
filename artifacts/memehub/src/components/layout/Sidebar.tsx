import { Link, useLocation } from "wouter";
import { Hash, TrendingUp, Flame, Clock, Trophy, Users, PlusCircle, Bell, Globe, Wallet, Zap } from "lucide-react";
import { Badge, Button } from "@/components/ui/shared";
import { useGetTags } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function Sidebar() {
  const { data: tagsData } = useGetTags();
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const currentSection = searchParams.get("section") || "hot";
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [communities, setCommunities] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("ovrhub_token") || localStorage.getItem("memehub_token");
    fetch(`${BASE}/api/communities`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(d => setCommunities((d.communities || []).slice(0, 5)))
      .catch(() => {});
  }, []);

  return (
    <aside className="w-64 shrink-0 hidden lg:block sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto pr-4 scrollbar-hide">

      {/* Upload CTA */}
      {isAuthenticated && (
        <Link href="/upload">
          <Button className="w-full mb-6 rounded-xl gap-2 font-bold shadow-lg shadow-primary/20">
            <PlusCircle className="w-5 h-5" /> Post a Meme
          </Button>
        </Link>
      )}

      {/* Main Navigation */}
      <div className="mb-4 space-y-0.5">
        <NavLink active={location === "/" && currentSection === "hot"} href="/" icon={<Flame className="w-5 h-5 text-red-500" />} label="Hot" />
        <NavLink active={location === "/" && currentSection === "trending"} href="/?section=trending" icon={<TrendingUp className="w-5 h-5 text-blue-400" />} label="Trending" />
        <NavLink active={location === "/" && currentSection === "fresh"} href="/?section=fresh" icon={<Clock className="w-5 h-5 text-green-400" />} label="Fresh" />
        <NavLink active={location === "/" && currentSection === "top"} href="/?section=top" icon={<Trophy className="w-5 h-5 text-yellow-500" />} label="Top" />
        {isAuthenticated && (
          <NavLink active={location === "/" && currentSection === "following"} href="/?section=following" icon={<Users className="w-5 h-5 text-purple-400" />} label="Following" />
        )}
        {isAuthenticated && (
          <NavLink active={location === "/notifications"} href="/notifications" icon={<Bell className="w-5 h-5 text-orange-400" />} label="Notifications" />
        )}
        {isAuthenticated && (
          <NavLink active={location === "/wallet"} href="/wallet" icon={<Wallet className="w-5 h-5 text-green-400" />} label="Wallet" />
        )}
        {isAuthenticated && (
          <NavLink active={location === "/tip-apply"} href="/tip-apply" icon={<Zap className="w-5 h-5 text-yellow-400" />} label="Enable Tips" />
        )}
      </div>

      {/* Communities */}
      <div className="mb-4 bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" /> Communities
          </h3>
          <Link href="/communities">
            <span className="text-xs text-primary font-bold hover:underline">All</span>
          </Link>
        </div>
        <div className="space-y-1">
          {communities.map(c => (
            <Link key={c.id} href={`/c/${c.slug}`}>
              <div className={cn(
                "flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all cursor-pointer",
                location === `/c/${c.slug}` ? "bg-primary/10 text-primary" : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}>
                <span className="text-base leading-none">{c.icon}</span>
                <span className="font-semibold text-sm truncate">{c.name}</span>
                {c.isMember && <span className="ml-auto text-[10px] text-primary font-bold">✓</span>}
              </div>
            </Link>
          ))}
          {communities.length === 0 && (
            <Link href="/communities">
              <span className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium">Browse communities →</span>
            </Link>
          )}
        </div>
      </div>

      {/* Popular Tags */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-display font-bold text-base mb-3 flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" /> Popular Tags
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {tagsData?.tags?.slice(0, 12).map(tag => (
            <Link key={tag.id} href={`/tag/${tag.slug}`}>
              <Badge variant="secondary" className="hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors px-2.5 py-1 text-xs font-semibold">
                {tag.name}
              </Badge>
            </Link>
          ))}
          {(!tagsData?.tags || tagsData.tags.length === 0) && (
            <p className="text-sm text-muted-foreground">No tags yet.</p>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-2 px-2">
        <p>© 2025 OVRHUB.</p>
        <div className="flex gap-3">
          <a href="#" className="hover:text-primary transition-colors">Rules</a>
          <a href="#" className="hover:text-primary transition-colors">Privacy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms</a>
        </div>
      </div>
    </aside>
  );
}

function NavLink({ href, icon, label, active }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link href={href} className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all",
      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground hover:translate-x-1"
    )}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
