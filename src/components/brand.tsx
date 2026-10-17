import { GithubIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { GITHUB_REPO_URL, HANGAR_DEPLOY_URL } from "@/lib/project";
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
      <path
        d="M7 18.5c2.2 0 2.9-5 5.1-5s2.9 5 5.1 5 2.9-5 5.1-5"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="24.8" cy="13.5" r="1.6" fill="white" />
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
      Bytewave
    </span>
  );
}

function HangarGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className={cn("size-3.5", className)}
    >
      <path
        d="M2 13.5V7.2L8 3l6 4.2v6.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 13.5v-3.5h5v3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The open-source call to action: spin up your own copy on Hangar. */
export function DeployOnHangarButton({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "lg";
}) {
  return (
    <a
      href={HANGAR_DEPLOY_URL}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group/deploy relative inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full bg-foreground font-medium text-background shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(0_0_0/0.12)] transition-[transform,background-color] outline-none hover:bg-[color-mix(in_srgb,var(--foreground)_88%,var(--background))] focus-visible:ring-[3px] focus-visible:ring-ring/40 active:translate-y-px",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-5 text-sm",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer-sweep bg-linear-to-r from-transparent via-white/15 to-transparent"
      />
      <HangarGlyph />
      Deploy on Hangar
    </a>
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
