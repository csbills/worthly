export const dashboardNavigationItems = [
  { href: "/", label: "Visão geral", icon: "overview" },
  { href: "/transactions", label: "Transações", icon: "transactions" },
  { href: "/credit-cards", label: "Cartões", icon: "credit-cards" },
  { href: "/investments", label: "Investimentos", icon: "investments" },
  { href: "/categories", label: "Categorias", icon: "categories" },
  { href: "/accounts", label: "Conexões", icon: "accounts" },
] as const;

export type DashboardNavigationItem = (typeof dashboardNavigationItems)[number];

export function isDashboardNavigationItemActive(
  href: DashboardNavigationItem["href"],
  pathname: string,
) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
