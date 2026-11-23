import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <Logo />
      <p className="font-script text-7xl font-bold text-cobalt">404</p>
      <h1 className="text-2xl font-extrabold">That page does not exist</h1>
      <p className="text-mute">The link may be old, or the page may have moved.</p>
      <Link href="/" className="btn-primary">Back to LINGUA</Link>
    </main>
  );
}
