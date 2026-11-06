export const dashboardNavigationItems = [
  { href: "/", label: "Visão geral", icon: "overview" },
  { href: "/transactions", label: "Transações", icon: "transactions" },
  { href: "/credit-cards", label: "Cartões", icon: "credit-cards" },
  { href: "/investments", label: "Investimentos", icon: "investments" },
  { href: "/planning", label: "Planejar", icon: "planning" },
  { href: "/assistant", label: "Tito", icon: "assistant" },
] as const;

export type DashboardNavigationItem = (typeof dashboardNavigationItems)[number];

export function isDashboardNavigationItemActive(
  href: DashboardNavigationItem["href"],
  pathname: string,
) {
  if (href === "/") {
    return pathname === "/";
  }

  const matches = (base: string) =>
    pathname === base || pathname.startsWith(`${base}/`);

  // Categorias saiu da barra e mora dentro de Planejar.
  return matches(href) || (href === "/planning" && matches("/categories"));
}
