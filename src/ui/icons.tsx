type IconProps = { size?: number; className?: string; filled?: boolean };

const base = (size = 20) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const SearchIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const BagIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
);
export const HeartIcon = ({ size, className, filled }: IconProps) => (
  <svg {...base(size)} className={className} fill={filled ? "currentColor" : "none"}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>
);
export const UserIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const MenuIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const CloseIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const PlusIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M12 5v14M5 12h14" /></svg>
);
export const MinusIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M5 12h14" /></svg>
);
export const ChevronIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="m9 6 6 6-6 6" /></svg>
);
export const ChevronDownIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="m6 9 6 6 6-6" /></svg>
);
export const ArrowIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const TruckIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></svg>
);
export const LeafIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" /><path d="M5 19 13 11" /></svg>
);
export const CheckIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="m5 12 4.5 4.5L19 7" /></svg>
);
export const ShieldIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const PinIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></svg>
);
export const ReturnIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></svg>
);
export const BellIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
);
export const SlidersIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
);

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="stars" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, rating - index));
        return (
          <svg key={index} width={size} height={size} viewBox="0 0 24 24">
            <defs>
              <linearGradient id={`star-${index}-${Math.round(fill * 100)}`}>
                <stop offset={`${fill * 100}%`} stopColor="currentColor" />
                <stop offset={`${fill * 100}%`} stopColor="var(--star-empty)" />
              </linearGradient>
            </defs>
            <path fill={`url(#star-${index}-${Math.round(fill * 100)})`} d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8L12 2.8Z" />
          </svg>
        );
      })}
    </span>
  );
}
