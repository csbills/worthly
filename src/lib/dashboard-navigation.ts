export const dashboardNavigationItems = [
  { href: "/", label: "Visão geral", icon: "overview" },
  { href: "/investments", label: "Investimentos", icon: "investments" },
  { href: "/transactions", label: "Transações", icon: "transactions" },
  { href: "/subscriptions", label: "Assinaturas", icon: "subscriptions" },
  { href: "/categories", label: "Categorias", icon: "categories" },
  { href: "/credit-cards", label: "Cartões", icon: "credit-cards" },
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
