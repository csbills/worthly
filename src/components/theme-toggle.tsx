"use client";

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

function isDarkNow(root: HTMLElement) {
  if (root.classList.contains("dark")) return true;
  if (root.classList.contains("light")) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = isDarkNow(root) ? "light" : "dark";

    root.classList.remove("dark", "light");
    root.classList.add(next);
    // biome-ignore lint/suspicious/noDocumentCookie: a plain preference cookie read by the root layout
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema"
      className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
    >
      <HugeiconsIcon
        icon={Sun03Icon}
        className="size-4 dark:hidden"
        strokeWidth={1.8}
      />
      <HugeiconsIcon
        icon={Moon02Icon}
        className="hidden size-4 dark:block"
        strokeWidth={1.8}
      />
    </button>
  );
}
