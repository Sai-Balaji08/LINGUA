import { AppShell } from "@/components/app/AppShell";
import { TimezoneCookie } from "@/components/app/TimezoneCookie";
import { requireOnboarded } from "@/lib/auth";

/** Private pages depend on the signed-in user, so they must never be prerendered at build time. */
export const dynamic = "force-dynamic";

/** Every learner page lives under here: it requires a signed-in, onboarded user. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireOnboarded();
  return (
    <AppShell displayName={profile.display_name} isAdmin={profile.role === "admin"}>
      <TimezoneCookie />
      {children}
    </AppShell>
  );
}
