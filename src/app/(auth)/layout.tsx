import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/** Shared frame for login, signup and password pages: a brand panel on desktop, a single column on phones. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden overflow-hidden bg-cobalt p-12 text-white lg:flex lg:flex-col lg:justify-between" aria-hidden="true">
        <Logo className="text-white [&_svg_path:first-child]:fill-white [&_svg_path:nth-child(2)]:stroke-[rgb(var(--cobalt))]" />
        <div>
          <div className="max-w-sm rounded-bubble bg-white/15 px-7 py-6 backdrop-blur-sm">
            <p className="font-script text-5xl font-bold leading-tight">¿Cómo estás?</p>
            <p className="mt-3 text-white/80">“How are you?” Today you will be able to answer.</p>
          </div>
          <div className="ml-16 mt-3 max-w-xs rounded-2xl rounded-tr-md bg-white px-5 py-4 text-ink">
            <p className="font-medium">Muy bien, gracias.</p>
            <p className="mt-1 text-sm text-mute">Very well, thank you.</p>
          </div>
        </div>
        <p className="max-w-sm text-sm text-white/80">Learn the language, not the streak. Core lessons are free, always.</p>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8">
          <Logo className="lg:invisible" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link href="/" className="btn-quiet">
              Back to site
            </Link>
          </div>
        </header>
        <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16 sm:px-0">
          {children}
        </main>
      </div>
    </div>
  );
}
