"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#languages", label: "Languages" },
  { href: "#method", label: "Method" },
  { href: "#free", label: "Free promise" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5" aria-label="Main">
        <Logo />
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="btn-quiet !py-2">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn-quiet hidden sm:inline-flex">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary">
            Start learning
          </Link>
          <button
            type="button"
            className="btn-quiet !px-2.5 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>
      {open && (
        <div id="mobile-menu" className="border-t border-line bg-paper px-5 py-3 md:hidden">
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 font-medium hover:bg-sunk">
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link href="/login" className="block rounded-lg px-3 py-3 font-medium hover:bg-sunk">
                Log in
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
