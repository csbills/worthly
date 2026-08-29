"use client";

import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChartRingIcon,
  SentIcon,
  ChartBarIncreasingIcon,
  CommandIcon,
  BriefcaseDollarIcon,
  BankIcon,
  ArrowLeftRightIcon,
  CreditCardIcon,
  CreditCardChangeIcon,
  TagsIcon,
} from "@hugeicons/core-free-icons";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Visão Geral",
      url: "/",
      icon: <HugeiconsIcon icon={ChartBarIncreasingIcon} strokeWidth={2} />,
    },
    {
      title: "Investimentos",
      url: "/investments",
      icon: <HugeiconsIcon icon={BriefcaseDollarIcon} strokeWidth={2} />,
    },
    {
      title: "Contas",
      url: "/accounts",
      icon: <HugeiconsIcon icon={BankIcon} strokeWidth={2} />,
    },
    {
      title: "Transações",
      url: "/transactions",
      icon: <HugeiconsIcon icon={ArrowLeftRightIcon} strokeWidth={2} />,
    },
    {
      title: "Parcelamentos",
      url: "/installments",
      icon: <HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} />,
    },
    {
      title: "Assinaturas",
      url: "/subscriptions",
      icon: <HugeiconsIcon icon={CreditCardChangeIcon} strokeWidth={2} />,
    },
    {
      title: "Categorias",
      url: "/categories",
      icon: <HugeiconsIcon icon={TagsIcon} strokeWidth={2} />,
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: <HugeiconsIcon icon={ChartRingIcon} strokeWidth={2} />,
    },
    {
      title: "Feedback",
      url: "#",
      icon: <HugeiconsIcon icon={SentIcon} strokeWidth={2} />,
    },
  ],
  projects: [],
};
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="#" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <HugeiconsIcon
                  icon={CommandIcon}
                  strokeWidth={2}
                  className="size-4"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Acme Inc</span>
                <span className="truncate text-xs">Enterprise</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
