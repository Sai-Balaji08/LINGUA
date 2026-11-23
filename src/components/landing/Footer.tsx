import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-mute">Learn a language. Don&apos;t just complete lessons.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-16 gap-y-2 text-sm">
          <a href="#how" className="text-mute hover:text-ink">How it works</a>
          <Link href="/signup" className="text-mute hover:text-ink">Create account</Link>
          <a href="#languages" className="text-mute hover:text-ink">Languages</a>
          <Link href="/login" className="text-mute hover:text-ink">Log in</Link>
          <a href="#free" className="text-mute hover:text-ink">Free promise</a>
          <a href="#faq" className="text-mute hover:text-ink">FAQ</a>
        </nav>
      </div>
      <p className="border-t border-line px-5 py-5 text-center text-xs text-mute">
        © {new Date().getFullYear()} LINGUA. Your learning data is yours.
      </p>
    </footer>
  );
}
