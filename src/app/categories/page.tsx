import {
  ArrowLeft01Icon,
  ArrowLeftRightIcon,
  ArrowRight01Icon,
  BankIcon,
  Car01Icon,
  ChevronDownIcon,
  HealthIcon,
  Home01Icon,
  RestaurantIcon,
  ShoppingBag01Icon,
  Tag01Icon,
  TicketsIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CurrencyCode } from "pluggy-sdk";

import {
  type CategorySpendingGroup,
  type CategorySpendingItem,
  getCategorySpending,
} from "@/actions/categories";
import { AppSidebar } from "@/components/app-sidebar";
import { CategorySpendingChart } from "@/components/category-spending-chart";
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

export const dynamic = "force-dynamic";

type CategoriesPageProps = {
  searchParams: Promise<{
    month?: string | string[] | undefined;
  }>;
};

const categoryIcons = {
  "05000000": ArrowLeftRightIcon,
  "07000000": BankIcon,
  "08000000": ShoppingBag01Icon,
  "11000000": RestaurantIcon,
  "17000000": Home01Icon,
  "18000000": HealthIcon,
  "19000000": Car01Icon,
  "21000000": TicketsIcon,
};

function formatCurrency(value: number, currencyCode: CurrencyCode) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
}

function getBarWidth(value: number) {
  return `${Math.min(100, Math.max(0, value))}%`;
}

function monthHref(monthKey: string) {
  return `/categories?month=${encodeURIComponent(monthKey)}`;
}

function CategoryProgressBar({
  percentage,
  color,
}: {
  percentage: number;
  color: string;
}) {
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
      aria-hidden="true"
    >
      <div
        className="h-full rounded-full transition-[width]"
        style={{ width: getBarWidth(percentage), backgroundColor: color }}
      />
    </div>
  );
}

function CategoryItem({
  category,
  color,
  currencyCode,
}: {
  category: CategorySpendingItem;
  color: string;
  currencyCode: CurrencyCode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <div className="min-w-0">
        <p className="truncate text-sm">{category.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatCount(category.transactionCount, "lançamento", "lançamentos")}
        </p>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <p className="text-right text-sm font-medium tabular-nums whitespace-nowrap">
          {formatCurrency(category.amount, currencyCode)}
        </p>
        <div className="hidden w-28 sm:block">
          <CategoryProgressBar percentage={category.percentage} color={color} />
        </div>
      </div>
    </div>
  );
}

function CategoryGroup({
  group,
  currencyCode,
}: {
  group: CategorySpendingGroup;
  currencyCode: CurrencyCode;
}) {
  const groupIcon =
    categoryIcons[group.key as keyof typeof categoryIcons] ?? Tag01Icon;

  return (
    <details open className="group border-b last:border-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-5 outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring md:px-6 [&::-webkit-details-marker]:hidden">
        <HugeiconsIcon
          icon={ChevronDownIcon}
          strokeWidth={2}
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: group.color }}
          aria-hidden="true"
        >
          <HugeiconsIcon icon={groupIcon} strokeWidth={2} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{group.label}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {formatCount(group.categoryCount, "categoria", "categorias")} ·{" "}
            {formatCount(group.transactionCount, "lançamento", "lançamentos")}
          </span>
        </span>
        <span className="w-28 shrink-0 text-right font-semibold tabular-nums">
          {formatCurrency(group.amount, currencyCode)}
        </span>
        <span className="hidden w-28 shrink-0 sm:block">
          <span className="sr-only">
            {formatPercentage(group.percentage)}% do total
          </span>
          <CategoryProgressBar
            percentage={group.percentage}
            color={group.color}
          />
        </span>
      </summary>

      <div className="mx-5 mb-5 ml-12 space-y-4 border-l border-border pl-4 md:mx-6 md:ml-16 md:pl-5">
        {group.categories.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            color={group.color}
            currencyCode={currencyCode}
          />
        ))}
      </div>
    </details>
  );
}

export default async function CategoriesPage({
  searchParams,
}: CategoriesPageProps) {
  const params = await searchParams;
  const requestedMonth = Array.isArray(params.month)
    ? params.month[0]
    : params.month;
  const result = await getCategorySpending(requestedMonth);

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
                  <BreadcrumbPage>Categorias</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-4 pt-0 md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Análise de gastos
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                Gastos por categoria
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Entenda onde seu dinheiro foi gasto no mês selecionado.
              </p>
            </div>
            <a
              href={monthHref(result.month.key)}
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

          <section className="grid items-center gap-6 rounded-2xl border bg-card p-5 shadow-xs md:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)] md:p-6">
            <div>
              <p className="text-4xl font-semibold tracking-[-0.03em] tabular-nums">
                {formatCurrency(result.total, result.currencyCode)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                gasto em {result.month.label}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {formatCount(
                  result.transactionCount,
                  "lançamento considerado",
                  "lançamentos considerados",
                )}
              </p>
            </div>

            <CategorySpendingChart
              groups={result.groups}
              total={result.total}
              currencyCode={result.currencyCode}
            />

            <nav
              aria-label="Navegação por mês"
              className="flex items-center justify-between gap-3 md:justify-end"
            >
              <a
                href={monthHref(result.month.previousKey)}
                aria-label="Mês anterior"
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={ArrowLeft01Icon}
                  strokeWidth={2}
                  className="size-5"
                />
              </a>
              <span className="min-w-36 text-center text-sm font-semibold">
                {result.month.label}
              </span>
              {result.month.isCurrent ? (
                <span
                  aria-disabled="true"
                  className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground/40"
                >
                  <span className="sr-only">Mês seguinte indisponível</span>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="size-5"
                  />
                </span>
              ) : (
                <a
                  href={monthHref(result.month.nextKey)}
                  aria-label="Mês seguinte"
                  className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="size-5"
                  />
                </a>
              )}
            </nav>
          </section>

          <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
            <div className="border-b px-5 py-4 md:px-6">
              <h2 className="text-sm font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Categorias
              </h2>
            </div>

            {result.groups.length > 0 ? (
              <div>
                {result.groups.map((group) => (
                  <CategoryGroup
                    key={group.key}
                    group={group}
                    currencyCode={result.currencyCode}
                  />
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <p className="font-medium">
                  Nenhum gasto categorizado neste mês
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Assim que houver saídas sincronizadas, elas aparecerão
                  agrupadas aqui. Investimentos e transferências para a mesma
                  pessoa ficam fora desta análise.
                </p>
                <a
                  href="/transactions"
                  className="mt-5 inline-flex h-9 items-center justify-center rounded-4xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
                >
                  Ver transações
                </a>
              </div>
            )}
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
