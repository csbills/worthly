"use client";

import {
  ArrowLeftRightIcon,
  BriefcaseDollarIcon,
  ChartBarIncreasingIcon,
  CreditCardIcon,
  Plug01Icon,
  TagsIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  dashboardNavigationItems,
  isDashboardNavigationItemActive,
} from "@/lib/dashboard-navigation";
import { cn } from "@/lib/utils";

const navigationIcons = {
  overview: ChartBarIncreasingIcon,
  transactions: ArrowLeftRightIcon,
  "credit-cards": CreditCardIcon,
  investments: BriefcaseDollarIcon,
  categories: TagsIcon,
  accounts: Plug01Icon,
} as const;

/**
 * The floating dark capsule that carries the app's navigation. Icons only,
 * with the active tab unfolding its label, so the bar stays the same quiet
 * object on a phone and on a desktop.
 */
export function DashboardTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="pointer-events-none fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-4"
    >
      <div className="pointer-events-auto relative flex items-center gap-1 overflow-visible rounded-full border border-white/10 bg-[#1f1f22]/95 p-1 shadow-[0_1px_1px_rgb(0_0_0/0.25),0_12px_32px_-6px_rgb(0_0_0/0.35)] backdrop-blur-xl">
        <span
          aria-hidden="true"
          className="glass-noise pointer-events-none absolute inset-0 rounded-full opacity-50 mix-blend-overlay"
        />
        {dashboardNavigationItems.map((item) => {
          const active = isDashboardNavigationItemActive(item.href, pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "group/tab relative flex h-11 items-center gap-2 rounded-full px-[11px] text-[13px] font-medium outline-none transition-colors duration-200 sm:h-9 sm:px-[9px]",
                "focus-visible:ring-2 focus-visible:ring-white/40 active:scale-95",
                active
                  ? "bg-white/12 pr-3.5 text-white"
                  : "text-white/45 hover:bg-white/8 hover:text-white/80",
              )}
            >
              <HugeiconsIcon
                icon={navigationIcons[item.icon]}
                aria-hidden="true"
                className="size-[18px] shrink-0"
                strokeWidth={1.8}
              />
              {active ? (
                <span className="hidden sm:inline">{item.label}</span>
              ) : (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 mb-2.5 -translate-x-1/2 translate-y-1 scale-95 rounded-[10px] bg-[#1c1c1f] px-2.5 py-1.5 text-xs whitespace-nowrap text-white opacity-0 shadow-[0_8px_24px_rgb(0_0_0/0.3)] ring-1 ring-white/10 transition-[opacity,transform] duration-150 group-hover/tab:translate-y-0 group-hover/tab:scale-100 group-hover/tab:opacity-100 group-focus-visible/tab:translate-y-0 group-focus-visible/tab:scale-100 group-focus-visible/tab:opacity-100"
                >
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
