import { cn } from "@/lib/utils";

export interface BadgeData {
  id: string;
  name: string;
  description?: string | null;
  icon: string;
  color: string;
  bgColor: string;
  isVerified: boolean;
}

const VERIFIED_ICON = (
  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function isSvg(icon: string) {
  return icon.trim().startsWith("<svg");
}

interface UserBadgeProps {
  badge: BadgeData;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

export function UserBadge({ badge, size = "sm", showTooltip = true, className }: UserBadgeProps) {
  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const content = badge.isVerified ? (
    <span style={{ color: badge.color }} className={cn("inline-flex items-center justify-center", sizeMap[size])}>
      {VERIFIED_ICON}
    </span>
  ) : isSvg(badge.icon) ? (
    <span
      style={{ color: badge.color, backgroundColor: badge.bgColor }}
      className={cn("inline-flex items-center justify-center rounded-full p-0.5", sizeMap[size])}
      dangerouslySetInnerHTML={{ __html: badge.icon }}
    />
  ) : (
    <span
      className={cn("inline-flex items-center justify-center rounded-full font-black border-2 select-none", sizeMap[size])}
      style={{ borderColor: badge.color, backgroundColor: badge.bgColor, color: badge.color, fontSize: size === "lg" ? "11px" : "9px" }}
    >
      {badge.icon.length > 2 ? badge.icon.slice(0, 2) : badge.icon}
    </span>
  );

  if (!showTooltip) return <>{content}</>;

  return (
    <span className={cn("relative group inline-flex", className)}>
      {content}
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-xs font-bold text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap"
        style={{ backgroundColor: badge.color }}>
        {badge.name}
      </span>
    </span>
  );
}

export function UserBadges({ badges, size = "sm", max = 3, className }: {
  badges?: BadgeData[];
  size?: "sm" | "md" | "lg";
  max?: number;
  className?: string;
}) {
  if (!badges || badges.length === 0) return null;

  const visible = badges.slice(0, max);
  const extra = badges.length - max;

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {visible.map(badge => (
        <UserBadge key={badge.id} badge={badge} size={size} />
      ))}
      {extra > 0 && (
        <span className="text-[10px] font-bold text-muted-foreground">+{extra}</span>
      )}
    </span>
  );
}
