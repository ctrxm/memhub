import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Ad {
  id: number;
  title: string;
  content?: string;
  imageUrl?: string;
  linkUrl?: string;
  position: string;
}

interface AdBannerProps {
  position: "feed_top" | "feed_middle" | "sidebar" | "between_posts";
  className?: string;
}

export function AdBanner({ position, className = "" }: AdBannerProps) {
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/ads/position/${position}`)
      .then(r => r.json())
      .then(d => {
        if (d.ads?.length) setAd(d.ads[0]);
      })
      .catch(() => {});
  }, [position]);

  if (!ad) return null;

  const handleClick = () => {
    fetch(`${BASE}/api/ads/${ad.id}/click`, { method: "POST" }).catch(() => {});
    if (ad.linkUrl) window.open(ad.linkUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={`relative ${className}`}>
      <span className="absolute top-1.5 right-2 text-[9px] font-semibold text-muted-foreground/50 tracking-wider uppercase z-10">Ad</span>
      <div
        onClick={ad.linkUrl ? handleClick : undefined}
        className={`rounded-xl border border-border/40 bg-card/50 overflow-hidden ${ad.linkUrl ? "cursor-pointer hover:border-border/60 transition-colors" : ""}`}
      >
        {ad.imageUrl && (
          <div className="w-full aspect-[4/1] overflow-hidden bg-muted">
            <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate">{ad.title}</p>
            {ad.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ad.content}</p>}
          </div>
          {ad.linkUrl && (
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}
