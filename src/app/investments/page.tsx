import Image from "next/image";
import type { CurrencyCode } from "pluggy-sdk";

import {
  getPortfolio,
  type PortfolioCurrencyResult,
} from "@/actions/portfolio";
import { DashboardShell } from "@/components/dashboard-shell";
import { ManualCryptoOrderModal } from "@/components/manual-crypto-order-modal";
import { PortfolioAllocationChart } from "@/components/portfolio-allocation-chart";
import { PortfolioEvolutionChart } from "@/components/portfolio-evolution-chart";
import { supportedCryptoAssets } from "@/lib/crypto-assets";
import {
  type PortfolioAssetSummary,
  type PortfolioCategorySummary,
  portfolioCategoryColors,
} from "@/lib/portfolio";

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

  const amount = formatCurrency(Math.abs(value), currencyCode);

  if (value > 0) {
    return `+${amount}`;
  }

  if (value < 0) {
    return `-${amount}`;
  }

  return amount;
}

function formatPercentage(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value)}%`;
}

function formatQuantity(value: number | null) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 8,
  }).format(value);
}

function formatDate(date: string | null) {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatSubtype(subtype: string | null) {
  if (!subtype) {
    return "Posição consolidada";
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

function getProfitClassName(value: number | null) {
  if (value === null) {
    return "text-muted-foreground";
  }

  return value >= 0
    ? "text-emerald-700 dark:text-emerald-400"
    : "text-destructive";
}

function getStatusMessage(status: string | undefined) {
  if (status === "order-saved") {
    return {
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
      text: "Ordem salva. A posição, o custo médio e o resultado foram recalculados.",
    };
  }

  if (status === "invalid-order") {
    return {
      className:
        "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
      text: "Informe dados válidos. Uma venda não pode exceder a quantidade disponível no histórico.",
    };
  }

  if (status === "order-error") {
    return {
      className: "border-destructive/30 bg-destructive/10 text-destructive",
      text: "Não foi possível salvar a ordem. Tente novamente.",
    };
  }

  if (status === "saved") {
    return {
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
      text: "Criptoativo salvo. A quantidade e o custo foram calculados; o preço de mercado será atualizado pela CoinGecko.",
    };
  }

  if (status === "invalid") {
    return {
      className:
        "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
      text: "Selecione um ativo e informe valores válidos para total, taxa e preço de compra.",
    };
  }

  if (status === "error") {
    return {
      className: "border-destructive/30 bg-destructive/10 text-destructive",
      text: "Não foi possível salvar o criptoativo. Tente novamente.",
    };
  }

  return null;
}

function PortfolioMetric({
  label,
  value,
  supportingText,
  valueClassName = "",
}: {
  label: string;
  value: string;
  supportingText?: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-2 text-xl font-semibold tabular-nums ${valueClassName}`}
      >
        {value}
      </p>
      {supportingText ? (
        <p className="mt-1 text-xs text-muted-foreground">{supportingText}</p>
      ) : null}
    </div>
  );
}

function AssetAvatar({ asset }: { asset: PortfolioAssetSummary }) {
  if (asset.logoPath) {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background">
        <Image
          src={asset.logoPath}
          alt={`${asset.name} logo`}
          width={32}
          height={32}
          className="size-7"
        />
      </span>
    );
  }

  const initials = asset.symbol.slice(0, 2).toLocaleUpperCase("pt-BR");

  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold text-white"
      style={{ backgroundColor: portfolioCategoryColors[asset.categoryKey] }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function AssetDetails({ asset }: { asset: PortfolioAssetSummary }) {
  const metadata =
    asset.source === "manual"
      ? `Manual · ${asset.priceSource ?? "Preço indisponível"}`
      : [
          formatSubtype(asset.subtype),
          asset.institutionName || asset.issuer || "Instituição não informada",
        ].join(" · ");
  const quantityDetails =
    asset.source === "manual"
      ? `${formatQuantity(asset.quantity)} ${asset.symbol} · preço ${formatCurrency(asset.unitPrice, asset.currencyCode)}`
      : asset.quantity !== null
        ? `Quantidade ${formatQuantity(asset.quantity)}`
        : null;
  const orderDetails =
    asset.source === "manual"
      ? formatCount(asset.orders.length, "ordem", "ordens")
      : null;
  const dueDate = formatDate(asset.dueDate);
  const secondaryDetails = [
    quantityDetails,
    orderDetails,
    dueDate ? `Vencimento ${dueDate}` : null,
  ].filter(Boolean);

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <p className="truncate font-semibold">{asset.name}</p>
        {asset.source === "manual" ? (
          <span className="shrink-0 rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
            Manual
          </span>
        ) : null}
      </div>
      <p className="mt-1 truncate text-sm text-muted-foreground">{metadata}</p>
      {secondaryDetails.length > 0 ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {secondaryDetails.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

function PortfolioAssetRow({ asset }: { asset: PortfolioAssetSummary }) {
  return (
    <div className="grid gap-4 px-5 py-4 transition-colors hover:bg-muted/20 sm:grid-cols-[minmax(0,1.5fr)_minmax(13rem,1fr)] sm:items-center md:px-6">
      <div className="flex min-w-0 items-start gap-3">
        <AssetAvatar asset={asset} />
        <div className="min-w-0 space-y-2">
          <AssetDetails asset={asset} />
          {asset.source === "manual" ? (
            <ManualCryptoOrderModal
              catalog={supportedCryptoAssets}
              asset={{
                id: asset.sourceId,
                symbol: asset.symbol,
                name: asset.name,
                coingeckoId: asset.coingeckoId,
                orders: asset.orders,
              }}
              triggerLabel="Editar ordens"
            />
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm sm:gap-5">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Saldo atual</p>
          <p className="mt-1 truncate font-semibold tabular-nums">
            {formatCurrency(asset.balance, asset.currencyCode)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Na categoria</p>
          <p className="mt-1 truncate font-medium tabular-nums">
            {formatPercentage(asset.percentageOfCategory)}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
            {formatPercentage(asset.percentageOfPortfolio)} da carteira
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-xs text-muted-foreground">Resultado</p>
          <p
            className={`mt-1 truncate font-medium tabular-nums ${getProfitClassName(asset.amountProfit)}`}
          >
            {formatSignedCurrency(asset.amountProfit, asset.currencyCode)}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
            {formatPercentage(asset.amountProfitPercentage)}
          </p>
        </div>
      </div>
    </div>
  );
}

function PortfolioCategory({
  category,
  currencyCode,
}: {
  category: PortfolioCategorySummary;
  currencyCode: CurrencyCode;
}) {
  return (
    <section className="overflow-hidden border-b last:border-b-0">
      <div className="flex flex-col justify-between gap-3 bg-muted/10 px-5 py-4 sm:flex-row sm:items-center md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: portfolioCategoryColors[category.key] }}
          />
          <div className="min-w-0">
            <h3 className="font-semibold">{category.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatCount(category.assetCount, "ativo", "ativos")} ·{" "}
              {formatPercentage(category.percentageOfPortfolio)} da carteira
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-3 sm:text-right">
          <p className="font-semibold tabular-nums">
            {formatCurrency(category.balance, currencyCode)}
          </p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatPercentage(category.percentageOfPortfolio)}
          </p>
        </div>
      </div>
      <div className="divide-y border-t">
        {category.assets.map((asset) => (
          <PortfolioAssetRow key={asset.id} asset={asset} />
        ))}
      </div>
    </section>
  );
}

function PortfolioCurrencyView({
  currency,
}: {
  currency: PortfolioCurrencyResult;
}) {
  const profitClassName = getProfitClassName(currency.amountProfit);

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Patrimônio em {currency.currencyCode}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCount(
              currency.assetCount,
              "ativo consolidado",
              "ativos consolidados",
            )}{" "}
            · {formatCount(currency.lots, "lote", "lotes")}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Snapshot diário atualizado ao abrir esta página
        </p>
      </div>

      <div className="grid gap-px overflow-hidden rounded-2xl border bg-border shadow-xs sm:grid-cols-2 xl:grid-cols-4">
        <PortfolioMetric
          label="Patrimônio atual"
          value={formatCurrency(currency.balance, currency.currencyCode)}
        />
        <PortfolioMetric
          label="Custo total"
          value={formatCurrency(currency.amountOriginal, currency.currencyCode)}
          supportingText="Base de custo disponível"
        />
        <PortfolioMetric
          label="Resultado acumulado"
          value={formatSignedCurrency(
            currency.amountProfit,
            currency.currencyCode,
          )}
          valueClassName={profitClassName}
        />
        <PortfolioMetric
          label="Rentabilidade"
          value={formatPercentage(
            currency.amountOriginal &&
              currency.amountOriginal > 0 &&
              currency.amountProfit !== null
              ? (currency.amountProfit / currency.amountOriginal) * 100
              : null,
          )}
          supportingText="Sobre o custo total"
          valueClassName={profitClassName}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="min-w-0 rounded-2xl border bg-card p-5 shadow-xs md:p-6 lg:col-span-8">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <h3 className="font-semibold">Evolução do patrimônio</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Valor consolidado por snapshot diário em {currency.currencyCode}
                .
              </p>
            </div>
            {currency.history.length > 0 ? (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {formatCount(currency.history.length, "dia", "dias")}
              </span>
            ) : null}
          </div>
          <div className="mt-5">
            <PortfolioEvolutionChart
              history={currency.history}
              currencyCode={currency.currencyCode}
            />
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border bg-card p-5 shadow-xs md:p-6 lg:col-span-4">
          <div>
            <h3 className="font-semibold">Alocação da carteira</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Distribuição do patrimônio por categoria.
            </p>
          </div>
          <PortfolioAllocationChart
            categories={currency.categories}
            currencyCode={currency.currencyCode}
          />
          <div className="divide-y">
            {currency.categories.map((category) => (
              <div
                key={category.key}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: portfolioCategoryColors[category.key],
                    }}
                  />
                  <span className="truncate text-sm font-medium">
                    {category.label}
                  </span>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {formatPercentage(category.percentageOfPortfolio)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <div className="border-b p-5 md:p-6">
          <div>
            <h3 className="font-semibold">Ativos da carteira</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Posições automáticas e manuais consolidadas, com participação e
              resultado de cada ativo.
            </p>
          </div>
        </div>
        {currency.categories.map((category) => (
          <PortfolioCategory
            key={category.key}
            category={category}
            currencyCode={currency.currencyCode}
          />
        ))}
      </section>
    </section>
  );
}

function EmptyPortfolio({ hasError }: { hasError: boolean }) {
  return (
    <section className="rounded-2xl border border-dashed bg-card p-10 text-center shadow-xs">
      <h2 className="font-semibold">
        {hasError
          ? "Não foi possível carregar o portfólio"
          : "Seu portfólio está vazio"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {hasError
          ? "Confira o status da conexão no Meu Pluggy e tente atualizar novamente. Você também pode cadastrar uma cripto manualmente."
          : "Conecte uma conta no Meu Pluggy ou cadastre uma cripto manualmente para começar a acompanhar sua carteira."}
      </p>
      <a
        href="/accounts"
        className="mt-5 inline-flex h-9 items-center justify-center rounded-4xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        Gerenciar conexões
      </a>
    </section>
  );
}

export default async function InvestmentsPage({
  searchParams,
}: InvestmentsPageProps) {
  const [params, result] = await Promise.all([searchParams, getPortfolio()]);
  const cryptoStatus = Array.isArray(params.crypto)
    ? params.crypto[0]
    : params.crypto;
  const statusMessage = getStatusMessage(cryptoStatus);
  const assetCount = result.currencies.reduce(
    (total, currency) => total + currency.assetCount,
    0,
  );
  const currencyCount = result.currencies.length;

  return (
    <DashboardShell>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Meu portfólio
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Uma visão consolidada dos investimentos conectados e dos
            criptoativos cadastrados manualmente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/investments"
            className="inline-flex h-9 items-center justify-center rounded-4xl border border-border bg-input/30 px-4 text-sm font-medium transition-colors hover:bg-input/50"
          >
            Atualizar dados
          </a>
          <ManualCryptoOrderModal catalog={supportedCryptoAssets} />
        </div>
      </div>

      {statusMessage ? (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${statusMessage.className}`}
          aria-live="polite"
        >
          {statusMessage.text}
        </p>
      ) : null}

      {result.error ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {result.error}
        </p>
      ) : null}

      <div className="grid gap-px overflow-hidden rounded-2xl border bg-border shadow-xs sm:grid-cols-3">
        <PortfolioMetric
          label="Ativos consolidados"
          value={String(assetCount)}
          supportingText="Pluggy + cadastro manual"
        />
        <PortfolioMetric
          label="Criptoativos manuais"
          value={String(result.manualAssetCount)}
          supportingText="Preço via CoinGecko"
        />
        <PortfolioMetric
          label="Conexões / moedas"
          value={`${result.itemCount} / ${currencyCount}`}
          supportingText="Itens Pluggy e moedas na carteira"
        />
      </div>

      {result.currencies.length > 0 ? (
        <div className="space-y-10">
          {result.currencies.map((currency) => (
            <PortfolioCurrencyView
              key={currency.currencyCode}
              currency={currency}
            />
          ))}
        </div>
      ) : (
        <EmptyPortfolio hasError={Boolean(result.error)} />
      )}
    </DashboardShell>
  );
}
