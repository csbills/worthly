import type { ReactNode } from "react";

import { DashboardTopNav } from "@/components/dashboard-top-nav";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-7xl justify-center px-4 pt-6 md:px-6 md:pt-10">
        <DashboardTopNav />
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-10 pt-10 md:px-6 md:pt-12">
        {children}
      </main>
    </div>
  );
}
