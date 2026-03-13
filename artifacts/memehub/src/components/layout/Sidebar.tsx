import { Link } from "wouter";
import { Hash, TrendingUp, Flame, Clock } from "lucide-react";
import { Badge } from "@/components/ui/shared";
import { useGetTags } from "@workspace/api-client-react";

export function Sidebar() {
  const { data: tagsData } = useGetTags();
  
  return (
    <aside className="w-64 shrink-0 hidden lg:block sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto pr-4">
      
      <div className="mb-8 space-y-1">
        <NavLink href="/" icon={<Flame className="w-5 h-5 text-red-500" />} label="Hot" />
        <NavLink href="/?section=trending" icon={<TrendingUp className="w-5 h-5 text-blue-500" />} label="Trending" />
        <NavLink href="/?section=fresh" icon={<Clock className="w-5 h-5 text-green-500" />} label="Fresh" />
      </div>

      <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
        <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
          <Hash className="w-5 h-5 text-primary" /> Popular Tags
        </h3>
        
        <div className="flex flex-wrap gap-2">
          {tagsData?.tags?.slice(0, 15).map(tag => (
            <Link key={tag.id} href={`/tag/${tag.slug}`}>
              <Badge variant="secondary" className="hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors px-3 py-1.5 text-sm">
                {tag.name}
              </Badge>
            </Link>
          ))}
          {(!tagsData?.tags || tagsData.tags.length === 0) && (
            <p className="text-sm text-muted-foreground">No tags trending yet.</p>
          )}
        </div>
      </div>

      <div className="mt-8 text-xs text-muted-foreground space-y-2 px-2">
        <p>© 2025 MemeHub.</p>
        <div className="flex gap-3">
          <a href="#" className="hover:text-primary transition-colors">Rules</a>
          <a href="#" className="hover:text-primary transition-colors">Privacy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms</a>
        </div>
      </div>
    </aside>
  );
}

function NavLink({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/80 font-bold transition-all hover:translate-x-1">
      {icon}
      <span>{label}</span>
    </Link>
  );
}
