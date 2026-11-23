import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-md space-y-3 p-8 text-center">
      <h1 className="text-2xl font-extrabold">We could not find that</h1>
      <p className="text-mute">The page may have moved, or the lesson may not be published.</p>
      <Link href="/dashboard" className="btn-primary">Back to home</Link>
    </div>
  );
}
