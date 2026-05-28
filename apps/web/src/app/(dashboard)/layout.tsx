"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { TrialGate } from "@/components/trial/TrialGate";
import { LgpdConsentGate } from "@/components/privacy/LgpdConsentGate";
import { BusinessVocabularyProvider } from "@/contexts/business-vocabulary-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <BusinessVocabularyProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto pb-20 lg:pb-0" style={{ scrollbarGutter: "stable" }}>{children}</main>
        <MobileNav />
        <OnboardingTour />
        <LgpdConsentGate />
        <TrialGate />
      </div>
      </BusinessVocabularyProvider>
    </RequireAuth>
  );
}
