"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function checkProfile() {
      try {
        const res = await fetch("/api/settings/profile");
        if (res.ok) {
          const { profile } = await res.json();
          if (profile?.onboarding_completed) {
            router.replace("/dashboard");
            return;
          }
        }
        setReady(true);
      } catch {
        setReady(true);
      }
    }
    checkProfile();
  }, [router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <OnboardingWizard />;
}
