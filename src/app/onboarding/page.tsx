import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { requireUser } from "@/lib/auth";
import { getLanguages } from "@/lib/data/courses";

export const metadata: Metadata = { title: "Set up your course" };

/** Lives outside the (app) group because that group sends un-onboarded learners here. */
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { supabase, profile } = await requireUser();
  if (profile.onboarded) redirect("/dashboard");
  const languages = await getLanguages(supabase);
  return (
    <main id="main">
      <OnboardingWizard languages={languages} initialName={profile.display_name} />
    </main>
  );
}
