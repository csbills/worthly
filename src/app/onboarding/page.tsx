import type { Metadata } from "next";
import Link from "next/link";

import { getOnboardingState } from "@/actions/onboarding";
import { GithubLink, Wordmark } from "@/components/brand";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { ThemeToggle } from "@/components/theme-toggle";
import { getInitialOnboardingStep } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Configuração",
};

export default async function OnboardingPage() {
  const state = await getOnboardingState();
  const canSkip = state.credentials !== null && state.connections.length > 0;
  const initialStep = getInitialOnboardingStep({
    hasCredentials: state.credentials !== null,
    connectionCount: state.connections.length,
  });

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Soft brand glow behind the stage. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-48 left-1/2 h-[28rem] w-[56rem] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-3xl"
      />
      <header className="relative mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <GithubLink />
          {canSkip ? (
            <Link
              href="/"
              className="ml-1 rounded-full px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Ir para o painel
            </Link>
          ) : null}
        </div>
      </header>
      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16 sm:px-6 md:pt-12">
        <OnboardingFlow state={state} initialStep={initialStep} />
      </main>
    </div>
  );
}
