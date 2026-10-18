import { GithubIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { GITHUB_REPO_URL } from "@/lib/project";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
      fill="none"
    >
      <rect width="32" height="32" rx="9" fill="currentColor" />
      {/* A W whose last stroke climbs past the first, like a chart going up. */}
      <path
        d="M7.5 12.5 11.6 22 16 15.3l4.4 6.7 4.1-12"
        stroke="white"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-[15px] font-medium tracking-[-0.02em]",
        className,
      )}
    >
      <LogoMark className="text-primary" />
      Worthly
    </span>
  );
}

export function GithubLink({ className }: { className?: string }) {
  return (
    <a
      href={GITHUB_REPO_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Código-fonte no GitHub"
      title="Código-fonte no GitHub"
      className={cn(
        "flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40",
        className,
      )}
    >
      <HugeiconsIcon icon={GithubIcon} className="size-4" strokeWidth={1.8} />
    </a>
  );
}
