"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChartColumn,
  Layers,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  Library,
} from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { signOut } from "@/app/(auth)/actions";

const NAV = [
  { href: "/dashboard", label: "Home", Icon: LayoutDashboard },
  { href: "/learn", label: "Learn", Icon: BookOpen },
  { href: "/review", label: "Review", Icon: Layers },
  { href: "/vocabulary", label: "Words", Icon: Library },
  { href: "/conversation", label: "Speak", Icon: MessageCircle },
  { href: "/progress", label: "Progress", Icon: ChartColumn },
];

function useActive(pathname: string) {
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  displayName,
  isAdmin,
}: {
  children: ReactNode;
  displayName: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const active = useActive(pathname);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-3 py-5 md:flex">
        <div className="px-3">
          <Logo href="/dashboard" />
        </div>
        <nav aria-label="Primary" className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active(href) ? "bg-cobalt-soft text-cobalt" : "text-mute hover:bg-sunk hover:text-ink"
              }`}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              aria-current={active("/admin") ? "page" : undefined}
              className={`mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active("/admin") ? "bg-saffron-soft text-ink" : "text-mute hover:bg-sunk hover:text-ink"
              }`}
            >
              <ShieldCheck size={18} aria-hidden="true" />
              Admin
            </Link>
          )}
        </nav>
        <div className="border-t border-line pt-3">
          <p className="truncate px-3 pb-2 text-xs text-mute" title={displayName}>
            {displayName}
          </p>
          <div className="flex items-center gap-1">
            <Link href="/settings" className="btn-quiet flex-1 !justify-start" aria-current={active("/settings") ? "page" : undefined}>
              <Settings size={16} aria-hidden="true" /> Settings
            </Link>
            <ThemeToggle />
          </div>
          <form action={signOut}>
            <button type="submit" className="btn-quiet w-full !justify-start">
              <LogOut size={16} aria-hidden="true" /> Log out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur md:hidden">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link href="/settings" className="btn-quiet !px-2.5" aria-label="Settings">
              <Settings size={18} />
            </Link>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${active(href) ? "text-cobalt" : "text-mute"}`}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
