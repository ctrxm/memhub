import { useEffect, useState } from "react";
import { X, Info, AlertTriangle, AlertCircle, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Broadcast {
  id: number;
  title: string;
  content: string;
  type: "info" | "warning" | "promo" | "alert";
}

const TYPE_STYLES = {
  info:    { bar: "bg-blue-500",   bg: "bg-blue-500/10 border-blue-500/30",   icon: <Info className="w-4 h-4 text-blue-400 shrink-0" />,           text: "text-blue-300" },
  warning: { bar: "bg-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30", icon: <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />, text: "text-yellow-300" },
  alert:   { bar: "bg-red-500",    bg: "bg-red-500/10 border-red-500/30",     icon: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,       text: "text-red-300" },
  promo:   { bar: "bg-primary",    bg: "bg-primary/10 border-primary/30",     icon: <Megaphone className="w-4 h-4 text-primary shrink-0" />,         text: "text-primary" },
};

export function BroadcastBanner() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(() => {
    try {
      const saved = sessionStorage.getItem("dismissed_broadcasts");
      return new Set(saved ? JSON.parse(saved) : []);
    } catch { return new Set(); }
  });

  useEffect(() => {
    fetch(`${BASE}/api/broadcasts`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.broadcasts)) setBroadcasts(d.broadcasts); })
      .catch(() => {});
  }, []);

  const dismiss = (id: number) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      sessionStorage.setItem("dismissed_broadcasts", JSON.stringify([...next]));
      return next;
    });
  };

  const visible = broadcasts.filter(b => !dismissed.has(b.id));
  if (!visible.length) return null;

  return (
    <div className="space-y-2 mb-4">
      {visible.map(b => {
        const s = TYPE_STYLES[b.type] || TYPE_STYLES.info;
        return (
          <div
            key={b.id}
            className={cn("relative flex items-start gap-3 px-4 py-3 rounded-xl border overflow-hidden animate-in slide-in-from-top-2 duration-300", s.bg)}
          >
            <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", s.bar)} />
            <div className="ml-1">{s.icon}</div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-bold leading-tight", s.text)}>{b.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{b.content}</p>
            </div>
            <button
              onClick={() => dismiss(b.id)}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
