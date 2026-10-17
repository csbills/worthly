import Link from "next/link";
import { type ReactNode, Suspense } from "react";

import { DeployOnHangarButton, GithubLink, Wordmark } from "@/components/brand";
import { DashboardTabBar } from "@/components/dashboard-tab-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { verifySession } from "@/lib/auth/dal";

async function CurrentUserMenu() {
  const user = await verifySession();

  return <UserMenu user={user} />;
}

function UserMenuFallback() {
  return (
    <span
      aria-hidden="true"
      className="size-9 animate-pulse rounded-full bg-muted sm:size-8"
    />
  );
}

/**
 * Static chrome: only the avatar waits for the session, so the header paints
 * right away and stays mounted while pages below it load.
 */
export function DashboardHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)]">
      {/* Progressive blur, no tint: sharpness itself fades out. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[calc(5.5rem+env(safe-area-inset-top))]"
      >
        <div className="absolute inset-0 mask-[linear-gradient(to_bottom,black_55%,transparent_84%)] backdrop-blur-[2px]" />
        <div className="absolute inset-0 mask-[linear-gradient(to_bottom,black_42%,transparent_70%)] backdrop-blur-[6px]" />
        <div className="absolute inset-0 mask-[linear-gradient(to_bottom,black_28%,transparent_56%)] backdrop-blur-[14px]" />
      </div>
      <div className="relative mx-auto flex h-14 w-full max-w-6.5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          aria-label="Worthly — visão geral"
          className="-ml-1 rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <GithubLink className="hidden sm:flex" />
          <DeployOnHangarButton className="mx-1.5 hidden md:inline-flex" />
          <Suspense fallback={<UserMenuFallback />}>
            <CurrentUserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

/** Rendered once by the (dashboard) layout, so it survives navigations. */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <DashboardHeader />
      <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-5 px-4 pt-[calc(4.5rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-6 md:pt-24">
        {children}
      </main>
      <DashboardTabBar />
    </div>
  );
}
