interface OvrHubLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function OvrHubLogoIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="12" fill="hsl(25,100%,50%)" />
      <path
        d="M10 34L18 14H22L27 27L32 14H36L28 34H24L19 21L14 34H10Z"
        fill="white"
      />
      <circle cx="38" cy="34" r="4" fill="white" />
    </svg>
  );
}

export function OvrHubLogoFull({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <OvrHubLogoIcon size={32} />
      <span className="font-display text-2xl font-bold tracking-tight text-foreground">
        OVR<span className="text-primary">HUB</span>
      </span>
    </span>
  );
}
