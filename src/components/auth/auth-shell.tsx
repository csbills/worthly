import type { ReactNode } from "react";

import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-56 left-1/2 h-[30rem] w-[52rem] -translate-x-1/2 rounded-full bg-primary/[0.08] blur-3xl"
      />
      <header className="relative mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 pt-[env(safe-area-inset-top)] sm:px-6">
        <Wordmark />
        <ThemeToggle />
      </header>
      <main className="relative flex flex-1 items-start justify-center px-4 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:items-center sm:pt-0">
        <div className="w-full max-w-[25rem]">
          <div className="surface p-6 sm:p-8">
            <h1 className="text-[1.625rem] leading-tight font-normal tracking-[-0.03em]">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
            <div className="mt-7">{children}</div>
          </div>
          {footer ? (
            <div className="mt-5 text-center text-xs leading-5 text-muted-foreground">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
