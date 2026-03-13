import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Search, PlusSquare, Bell, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function Layout({ children, hideSidebar = false }: { children: ReactNode, hideSidebar?: boolean }) {
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background relative selection:bg-primary/30">
      <Navbar />

      <main className="flex-1 container mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6 flex gap-8 justify-center pb-20 md:pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            className="flex-1 max-w-[640px] w-full min-w-0"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>

        {!hideSidebar && <Sidebar />}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-border/50 bottom-safe">
        <div className="flex items-center justify-around h-14 px-2">
          <MobileNavItem href="/" icon={<Flame className="w-5 h-5" />} label="Hot" active={location === "/"} />
          <MobileNavItem href="/search" icon={<Search className="w-5 h-5" />} label="Search" active={location === "/search"} />
          {isAuthenticated ? (
            <MobileNavItem href="/upload" icon={<PlusSquare className="w-6 h-6" />} label="Post" active={location === "/upload"} isPrimary />
          ) : (
            <MobileNavItem href="/register" icon={<PlusSquare className="w-6 h-6" />} label="Join" active={false} isPrimary />
          )}
          {isAuthenticated ? (
            <MobileNavItem href="/notifications" icon={<Bell className="w-5 h-5" />} label="Alerts" active={location === "/notifications"} />
          ) : (
            <MobileNavItem href="/login" icon={<Bell className="w-5 h-5" />} label="Alerts" active={false} />
          )}
          {isAuthenticated ? (
            <MobileNavItem href={`/u/${user?.username}`} icon={<User className="w-5 h-5" />} label="Profile" active={location === `/u/${user?.username}`} />
          ) : (
            <MobileNavItem href="/login" icon={<User className="w-5 h-5" />} label="Login" active={location === "/login"} />
          )}
        </div>
      </nav>
    </div>
  );
}

function MobileNavItem({
  href,
  icon,
  label,
  active,
  isPrimary,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  isPrimary?: boolean;
}) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1">
      <span
        className={cn(
          "flex items-center justify-center transition-colors",
          isPrimary
            ? "w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
            : active
            ? "text-primary"
            : "text-muted-foreground"
        )}
      >
        {icon}
      </span>
      {!isPrimary && (
        <span className={cn("text-[10px] font-semibold", active ? "text-primary" : "text-muted-foreground")}>
          {label}
        </span>
      )}
    </Link>
  );
}
