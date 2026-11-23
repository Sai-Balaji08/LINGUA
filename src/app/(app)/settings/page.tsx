import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { DeleteAccountForm, NotificationsForm, PasswordForm, PreferencesForm, PrivacyForm, ProfileForm } from "@/components/settings/SettingsForms";
import { requireOnboarded } from "@/lib/auth";
import { getLanguages } from "@/lib/data/courses";
import { signOut } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Settings" };

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="card p-5 sm:p-6">
      <h2 id={id} className="text-xl font-extrabold">{title}</h2>
      {intro && <p className="mt-1 text-sm text-mute">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const { supabase, user, profile } = await requireOnboarded();
  const languages = await getLanguages(supabase);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Settings</h1>
        <p className="mt-1 text-mute">Change how LINGUA works for you. You can update your learning preferences whenever your goals change.</p>
      </header>

      <Section id="profile-h" title="Profile">
        <ProfileForm profile={profile} email={user.email ?? ""} />
      </Section>
      <Section id="learning-h" title="Learning" intro="The same questions you answered when you joined.">
        <PreferencesForm profile={profile} languages={languages} />
      </Section>
      <Section id="notif-h" title="Notifications">
        <NotificationsForm profile={profile} />
      </Section>
      <Section id="privacy-h" title="Privacy">
        <PrivacyForm profile={profile} />
      </Section>
      <Section id="account-h" title="Account">
        <div className="space-y-8">
          <PasswordForm />
          <form action={signOut} className="border-t border-line pt-6">
            <button type="submit" className="btn-ghost">
              <LogOut size={16} aria-hidden="true" /> Log out
            </button>
          </form>
        </div>
      </Section>
      <section aria-labelledby="danger-h" className="rounded-2xl border border-coral/40 p-5 sm:p-6">
        <h2 id="danger-h" className="text-xl font-extrabold text-coral">Delete account</h2>
        <div className="mt-4">
          <DeleteAccountForm />
        </div>
      </section>
    </div>
  );
}
