"use client";

import {
  ArrowLeftRightIcon,
  BankIcon,
  BriefcaseDollarIcon,
  ChartBarIncreasingIcon,
  CreditCardChangeIcon,
  CreditCardIcon,
  TagsIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  dashboardNavigationItems,
  isDashboardNavigationItemActive,
} from "@/lib/dashboard-navigation";

const navigationIcons = {
  overview: ChartBarIncreasingIcon,
  investments: BriefcaseDollarIcon,
  accounts: BankIcon,
  transactions: ArrowLeftRightIcon,
  subscriptions: CreditCardChangeIcon,
  categories: TagsIcon,
  "credit-cards": CreditCardIcon,
} as const;

export function DashboardTopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal" className="w-full px-2 md:px-0">
      <div className="flex flex-wrap justify-center gap-2 pb-1">
        {dashboardNavigationItems.map((item) => {
          const isActive = isDashboardNavigationItemActive(item.href, pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                isActive
                  ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border/80 bg-background text-muted-foreground hover:border-foreground/20 hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <HugeiconsIcon
                icon={navigationIcons[item.icon]}
                aria-hidden="true"
                className="size-4"
                strokeWidth={2}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
