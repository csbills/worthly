import { ArrowUpRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { getSpendingPace } from "@/actions/overview";
import { AppSidebar } from "@/components/app-sidebar";
import { SpendingPaceChart } from "@/components/spending-pace-chart";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getSpendingComparison } from "@/lib/spending-comparison";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(Math.abs(value));
}

function getComparison(current: number, previous: number) {
  const spendingComparison = getSpendingComparison(current, previous);

  if (spendingComparison.label === "acima") {
    return {
      difference: spendingComparison.difference,
      label: "acima",
      className: "text-destructive",
      badgeClassName: "bg-destructive/10 text-destructive",
      delta:
        spendingComparison.percentage !== null
          ? `+${formatPercentage(spendingComparison.percentage)}%`
          : "novo gasto",
      isAbovePrevious: true,
    };
  }

  if (spendingComparison.label === "abaixo") {
    return {
      difference: spendingComparison.difference,
      label: "abaixo",
      className: "text-emerald-700",
      badgeClassName: "bg-emerald-500/10 text-emerald-700",
      delta:
        spendingComparison.percentage !== null
          ? `-${formatPercentage(spendingComparison.percentage)}%`
          : "sem base",
      isAbovePrevious: false,
    };
  }

  return {
    difference: spendingComparison.difference,
    label: "igual",
    className: "text-muted-foreground",
    badgeClassName: "bg-muted text-muted-foreground",
    delta:
      spendingComparison.percentage !== null
        ? `${formatPercentage(spendingComparison.percentage)}%`
        : "sem base",
    isAbovePrevious: false,
  };
}

export default async function Page() {
  const result = await getSpendingPace();
  const comparison = getComparison(
    result.currentMonth.total,
    result.previousMonth.total,
  );

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Visão geral</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-4 pt-0 md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Visão geral
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Acompanhe o ritmo das suas finanças e os principais movimentos
                das contas conectadas.
              </p>
            </div>
            <a
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-4xl border border-border bg-input/30 px-4 text-sm font-medium transition-colors hover:bg-input/50"
            >
              Atualizar
            </a>
          </div>

          {result.error ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
              {result.error}
            </p>
          ) : null}

          <div className="grid grid-cols-12 gap-4">
            <section className="col-span-12 min-w-0 rounded-2xl border bg-card p-4 lg:col-span-6 md:p-5">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-sm font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  Ritmo de gastos
                </h2>
                <a
                  href="/transactions"
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800"
                >
                  Ver todas
                  <HugeiconsIcon
                    icon={ArrowUpRight02Icon}
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={2}
                  />
                </a>
              </div>

              <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-3xl font-semibold tracking-[-0.03em] tabular-nums md:text-4xl">
                  {formatCurrency(comparison.difference)}
                </p>
                <p className={`text-sm font-medium ${comparison.className}`}>
                  {comparison.label}
                </p>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums ${comparison.badgeClassName}`}
                >
                  {comparison.delta}
                </span>
                <span>
                  vs {formatCurrency(result.previousMonth.total)} mês anterior
                </span>
              </div>

              {result.points.length > 0 ? (
                <SpendingPaceChart
                  points={result.points}
                  currentMonthLabel={result.currentMonth.label}
                  previousMonthLabel={result.previousMonth.label}
                  isAbovePrevious={comparison.isAbovePrevious}
                />
              ) : (
                <div className="mt-4 flex h-52 flex-col items-center justify-center rounded-xl bg-muted/30 px-6 text-center">
                  <p className="font-medium">
                    {result.error
                      ? "Não foi possível carregar o ritmo de gastos"
                      : "Nenhuma conta conectada"}
                  </p>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    {result.error
                      ? "Confira a conexão no Meu Pluggy e tente atualizar novamente."
                      : "Cadastre um itemId em Contas para acompanhar suas despesas aqui."}
                  </p>
                  <a
                    href="/accounts"
                    className="mt-4 inline-flex h-9 items-center justify-center rounded-4xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
                  >
                    Gerenciar contas
                  </a>
                </div>
              )}
            </section>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
