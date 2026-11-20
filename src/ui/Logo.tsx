export function LeafMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M5.5 34.5C5 18.5 15.5 6.5 35 4.8c.4 19.8-11.6 30.3-29.5 29.7Z" fill="currentColor" />
      <path d="M9.5 31c5.4-8.2 11.6-14.6 19.3-19.6" fill="none" stroke="var(--logo-vein, #fff)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ tone = "brand" }: { tone?: "brand" | "light" }) {
  return (
    <span className={`logo logo-${tone}`} aria-label="Vitaly">
      <LeafMark />
      <span className="logo-word" aria-hidden="true">VITALY</span>
    </span>
  );
}
