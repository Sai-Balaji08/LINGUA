import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

/**
 * Everything under /admin requires the admin role. The role is read from the database on the server;
 * anyone else gets a 404. The Server Actions and Row Level Security check it again on every write.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl bg-saffron-soft px-4 py-3 text-sm">
        <ShieldCheck size={18} aria-hidden="true" />
        <span className="font-semibold">Content management</span>
        <span className="text-mute">Changes here are visible to learners as soon as items are published.</span>
        <Link href="/admin" className="ml-auto font-semibold text-cobalt hover:underline">All languages</Link>
      </div>
      {children}
    </div>
  );
}
