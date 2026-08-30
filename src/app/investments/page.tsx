import type { CurrencyCode } from "pluggy-sdk";

import {
  getInvestments,
  type InvestmentCategorySummary,
  type InvestmentCurrencySummary,
  type SerializedInvestment,
} from "@/actions/investments";
import { getManualCryptoAssets } from "@/actions/manual-crypto-assets";
import { AppSidebar } from "@/components/app-sidebar";
import { InvestmentsAllocationChart } from "@/components/investments-allocation-chart";
import { ManualCryptoAssetsSection } from "@/components/manual-crypto-assets-section";
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
import { investmentCategoryColors } from "@/lib/investment-category-colors";

export const dynamic = "force-dynamic";

const timeZone = "America/Sao_Paulo";

type InvestmentsPageProps = {
  searchParams: Promise<{
    crypto?: string | string[] | undefined;
  }>;
};

const investmentSubtypeLabels: Record<string, string> = {
  BDR: "BDR",
  CDB: "CDB",
  COE: "COE",
  CORPORATE_DEBT: "Dívida corporativa",
  CRA: "CRA",
  CRI: "CRI",
  DEBENTURES: "Debêntures",
  DERIVATIVES: "Derivativos",
  ETF: "ETF",
  ETF_FUND: "Fundo ETF",
  EXCHANGE_FUND: "Fundo cambial",
  FI_AGRO: "Fundo Fiagro",
  FI_INFRA: "Fundo de infraestrutura",
  FIXED_INCOME_FUND: "Fundo de renda fixa",
  FIP_FUND: "FIP",
  INVESTMENT_FUND: "Fundo de investimento",
  LCA: "LCA",
  LCI: "LCI",
  LC: "Letra de crédito",
  MULTIMARKET_FUND: "Fundo multimercado",
  OFFSHORE_FUND: "Fundo offshore",
  OPTION: "Opção",
  REAL_ESTATE_FUND: "Fundo imobiliário",
  RETIREMENT: "Previdência",
  STOCK: "Ação",
  STOCK_FUND: "Fundo de ações",
  STRUCTURED_NOTE: "Nota estruturada",
  TREASURY: "Tesouro direto",
};

function formatCurrency(value: number | null, currencyCode: CurrencyCode) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedCurrency(
  value: number | null,
  currencyCode: CurrencyCode,
) {
  if (value === null) {
    return "Sem dados";
  }

  const absoluteValue = formatCurrency(Math.abs(value), currencyCode);

  if (value > 0) {
    return `+${absoluteValue}`;
  }

  if (value < 0) {
    return `-${absoluteValue}`;
  }

  return absoluteValue;
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatRate(investment: SerializedInvestment) {
  if (investment.hasMultipleRates) {
    return "Taxas variadas";
  }

  const rate = [
    { label: "12m", value: investment.lastTwelveMonthsRate },
    { label: "ano", value: investment.annualRate },
    { label: "a.a.", value: investment.fixedAnnualRate },
  ].find((entry) => entry.value !== null);

  if (!rate) {
    return "—";
  }

  const formattedRate = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rate.value as number);

  return `${rate.label} ${rate.value && rate.value > 0 ? "+" : ""}${formattedRate}%`;
}

function formatSubtype(subtype: string | null) {
  if (!subtype) {
    return "Categoria geral";
  }

  return (
    investmentSubtypeLabels[subtype] ??
    subtype
      .replaceAll("_", " ")
      .toLocaleLowerCase("pt-BR")
      .replace(/^./, (letter) => letter.toLocaleUpperCase("pt-BR"))
  );
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatConsolidatedCount(count: number, lots: number) {
  const consolidatedCount = formatCount(
    count,
    "ativo consolidado",
    "ativos consolidados",
  );

  if (lots === count) {
    return consolidatedCount;
  }

  return `${consolidatedCount} · ${formatCount(lots, "lote", "lotes")}`;
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
}

function InvestmentCategorySection({
  category,
  investments,
  currencyCode,
}: {
  category: InvestmentCategorySummary;
  investments: SerializedInvestment[];
  currencyCode: CurrencyCode;
}) {
  const categoryInvestments = investments.filter(
    (investment) => investment.type === category.key,
  );

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div className="flex flex-col justify-between gap-2 border-b p-5 md:flex-row md:items-center md:p-6">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: investmentCategoryColors[category.key] }}
          />
          <div>
            <h3 className="font-semibold">{category.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatConsolidatedCount(category.count, category.lots)}
            </p>
          </div>
        </div>
        <p className="font-semibold tabular-nums">
          {formatCurrency(category.balance, currencyCode)}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full border-collapse text-left">
          <thead>
            <tr className="border-b text-xs tracking-wide text-muted-foreground uppercase">
              <th scope="col" className="px-4 py-3 font-medium">
                Investimento
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Instituição
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Saldo atual
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Resultado
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Rentabilidade
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Vencimento
              </th>
            </tr>
          </thead>
          <tbody>
            {categoryInvestments.map((investment) => {
              const profitClassName =
                investment.amountProfit === null
                  ? "text-muted-foreground"
                  : investment.amountProfit >= 0
                    ? "text-emerald-700"
                    : "text-destructive";

              return (
                <tr
                  key={investment.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="min-w-64 px-4 py-4 align-top">
                    <p className="font-medium">{investment.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatSubtype(investment.subtype)}
                      {investment.positionCount > 1
                        ? ` · ${formatCount(investment.positionCount, "lote", "lotes")}`
                        : null}
                    </p>
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-muted-foreground">
                    {investment.institutionName ||
                      investment.issuer ||
                      "Instituição não informada"}
                  </td>
                  <td className="px-4 py-4 text-right align-top font-medium tabular-nums whitespace-nowrap">
                    {formatCurrency(investment.balance, currencyCode)}
                  </td>
                  <td
                    className={`px-4 py-4 text-right align-top font-medium tabular-nums whitespace-nowrap ${profitClassName}`}
                  >
                    {formatSignedCurrency(
                      investment.amountProfit,
                      currencyCode,
                    )}
                  </td>
                  <td className="px-4 py-4 text-right align-top text-sm tabular-nums whitespace-nowrap">
                    {formatRate(investment)}
                  </td>
                  <td className="px-4 py-4 text-right align-top text-sm text-muted-foreground whitespace-nowrap">
                    {investment.hasMultipleDueDates
                      ? "Vencimentos variados"
                      : formatDate(investment.dueDate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CurrencyOverview({
  currency,
  investments,
}: {
  currency: InvestmentCurrencySummary;
  investments: SerializedInvestment[];
}) {
  const currencyInvestments = investments.filter(
    (investment) => investment.currencyCode === currency.currencyCode,
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Patrimônio em {currency.currencyCode}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatConsolidatedCount(currencyInvestments.length, currency.lots)}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Atualizado pela última sincronização da instituição
        </p>
      </div>

      <div className="grid gap-px overflow-hidden rounded-2xl border bg-border shadow-xs sm:grid-cols-3">
        <div className="bg-card p-5">
          <p className="text-sm text-muted-foreground">Saldo atual</p>
          <p className="mt-2 text-xl font-semibold tabular-nums">
            {formatCurrency(currency.balance, currency.currencyCode)}
          </p>
        </div>
        <div className="bg-card p-5">
          <p className="text-sm text-muted-foreground">Valor original</p>
          <p className="mt-2 text-xl font-semibold tabular-nums">
            {formatCurrency(currency.amountOriginal, currency.currencyCode)}
          </p>
        </div>
        <div className="bg-card p-5">
          <p className="text-sm text-muted-foreground">Lucro / prejuízo</p>
          <p
            className={`mt-2 text-xl font-semibold tabular-nums ${currency.amountProfit === null ? "text-muted-foreground" : currency.amountProfit >= 0 ? "text-emerald-700" : "text-destructive"}`}
          >
            {formatSignedCurrency(currency.amountProfit, currency.currencyCode)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="rounded-2xl border bg-card p-5 shadow-xs md:p-6">
          <div>
            <h3 className="font-semibold">Alocação por categoria</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Distribuição do saldo líquido atual.
            </p>
          </div>
          <InvestmentsAllocationChart
            categories={currency.categories}
            currencyCode={currency.currencyCode}
          />
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs md:p-6">
          <div>
            <h3 className="font-semibold">Resumo por categoria</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Veja onde o patrimônio está concentrado.
            </p>
          </div>
          <div className="mt-5 divide-y">
            {currency.categories.map((category) => {
              const percentage =
                currency.balance > 0
                  ? (category.balance / currency.balance) * 100
                  : 0;

              return (
                <div
                  key={category.key}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="size-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor: investmentCategoryColors[category.key],
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{category.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatConsolidatedCount(category.count, category.lots)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium tabular-nums">
                      {formatCurrency(category.balance, currency.currencyCode)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                      {formatPercentage(percentage)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {currency.categories.map((category) => (
          <InvestmentCategorySection
            key={category.key}
            category={category}
            investments={currencyInvestments}
            currencyCode={currency.currencyCode}
          />
        ))}
      </div>
    </section>
  );
}

export default async function InvestmentsPage({
  searchParams,
}: InvestmentsPageProps) {
  const params = await searchParams;
  const cryptoStatus = Array.isArray(params.crypto)
    ? params.crypto[0]
    : params.crypto;
  const [result, manualCryptoResult] = await Promise.all([
    getInvestments(),
    getManualCryptoAssets(),
  ]);
  const institutionCount = new Set(
    result.investments
      .map((investment) => investment.institutionName || investment.issuer)
      .filter(Boolean),
  ).size;
  const currencyCount = new Set([
    ...result.currencies.map((currency) => currency.currencyCode),
    ...manualCryptoResult.assets.map((asset) => asset.currencyCode),
  ]).size;

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
                  <BreadcrumbPage>Investimentos</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-4 pt-0 md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Investimentos
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Acompanhe a composição do seu patrimônio e o desempenho das
                posições conectadas.
              </p>
            </div>
            <a
              href="/investments"
              className="inline-flex h-9 items-center justify-center rounded-4xl border border-border bg-input/30 px-4 text-sm font-medium transition-colors hover:bg-input/50"
            >
              Atualizar
            </a>
          </div>

          <div className="grid gap-px overflow-hidden rounded-2xl border bg-border shadow-xs sm:grid-cols-3">
            <div className="bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Ativos sincronizados
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {result.investments.length}
              </p>
            </div>
            <div className="bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Criptoativos manuais
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {manualCryptoResult.assets.length}
              </p>
            </div>
            <div className="bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Instituições / moedas
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {institutionCount} / {currencyCount}
              </p>
            </div>
          </div>

          {result.error ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
              {result.error}
            </p>
          ) : null}

          <ManualCryptoAssetsSection
            assets={manualCryptoResult.assets}
            error={manualCryptoResult.error}
            status={cryptoStatus}
          />

          {result.currencies.length > 0 ? (
            <div className="space-y-10">
              {result.currencies.map((currency) => (
                <CurrencyOverview
                  key={currency.currencyCode}
                  currency={currency}
                  investments={result.investments}
                />
              ))}
            </div>
          ) : (
            <section className="rounded-2xl border bg-card p-10 text-center shadow-xs">
              <h2 className="font-semibold">
                {result.error
                  ? "Não foi possível carregar os investimentos"
                  : "Nenhum investimento encontrado"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {result.error
                  ? "Confira o status da conexão no Meu Pluggy e tente atualizar novamente."
                  : "Quando uma conexão tiver posições sincronizadas, elas aparecerão aqui separadas por categoria."}
              </p>
              <a
                href="/accounts"
                className="mt-5 inline-flex h-9 items-center justify-center rounded-4xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                Gerenciar conexões
              </a>
            </section>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
