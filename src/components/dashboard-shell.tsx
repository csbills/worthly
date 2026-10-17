import Link from "next/link";
import type { ReactNode } from "react";

import { DeployOnHangarButton, GithubLink, Wordmark } from "@/components/brand";
import { DashboardTabBar } from "@/components/dashboard-tab-bar";
import { ThemeToggle } from "@/components/theme-toggle";

export function DashboardHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      {/* Progressive blur, no tint: sharpness itself fades out. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-22"
      >
        <div className="absolute inset-0 mask-[linear-gradient(to_bottom,black_55%,transparent_84%)] backdrop-blur-[2px]" />
        <div className="absolute inset-0 mask-[linear-gradient(to_bottom,black_42%,transparent_70%)] backdrop-blur-[6px]" />
        <div className="absolute inset-0 mask-[linear-gradient(to_bottom,black_28%,transparent_56%)] backdrop-blur-[14px]" />
      </div>
      <div className="relative mx-auto flex h-14 w-full max-w-6.5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          aria-label="Bytewave — visão geral"
          className="-ml-1 rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <GithubLink />
          <DeployOnHangarButton className="ml-1.5 hidden sm:inline-flex" />
        </div>
      </div>
    </header>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pt-20 pb-32 md:px-6 md:pt-24">
        {children}
      </main>
      <DashboardTabBar />
    </div>
  );
}
