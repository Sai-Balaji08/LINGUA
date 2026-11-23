import Link from "next/link";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M16 3C8.8 3 3 8 3 14.2c0 3.4 1.7 6.4 4.4 8.4L6.2 28l5.6-2.6c1.3.3 2.700.5 4.200.5 7.200 0 13-5 13-11.200S23.200 3 16 3Z"
        fill="rgb(var(--cobalt))"
      />
      <path d="M11.500 9.500v9h5.500" stroke="#fff" strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="21.500" cy="18.500" r="2.200" fill="rgb(var(--saffron))" />
    </svg>
  );
}

export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 ${className}`} aria-label="LINGUA home">
      <LogoMark />
      <span className="font-display text-xl font-extrabold tracking-tight">lingua</span>
    </Link>
  );
}
