import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import type { CurrencyCode } from "pluggy-sdk";
import {
  getPortfolio,
  type PortfolioCurrencyResult,
} from "@/actions/portfolio";
import { DashboardShell } from "@/components/dashboard-shell";
import { ManualCryptoOrderModal } from "@/components/manual-crypto-order-modal";
import { ManualMarketOrderModal } from "@/components/manual-market-order-modal";
import { PortfolioAllocationChart } from "@/components/portfolio-allocation-chart";
import { PortfolioEvolutionChart } from "@/components/portfolio-evolution-chart";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supportedCryptoAssets } from "@/lib/crypto-assets";
import { supportedMarketAssets } from "@/lib/market-assets";
import {
  type PortfolioAssetSummary,
  type PortfolioCategorySummary,
  portfolioCategoryColors,
} from "@/lib/portfolio";
import {
  getPortfolioAssetLabel,
  getPortfolioAssetLogoPath,
  getPortfolioAssetQuantityLabel,
  getPortfolioCategoryToggleLabel,
} from "@/lib/portfolio-display";

export const dynamic = "force-dynamic";

type InvestmentsPageProps = {
  searchParams: Promise<{
    crypto?: string | string[] | undefined;
    market?: string | string[] | undefined;
  }>;
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

  if (status === "order-deleted") {
    return {
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
      text: "Ordem excluída. A posição, o custo médio e o resultado foram recalculados.",
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
      text: "Não foi possível salvar ou excluir a ordem. Tente novamente.",
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
  const logoPath = getPortfolioAssetLogoPath(asset);

  if (logoPath) {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background">
        <Image
          src={logoPath}
          alt={`${getPortfolioAssetLabel(asset)} logo`}
          width={24}
          height={24}
          className="size-6 object-contain"
        />
      </span>
    );
  }

  const initials = asset.symbol.slice(0, 2).toLocaleUpperCase("pt-BR");

  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-white"
      style={{ backgroundColor: portfolioCategoryColors[asset.categoryKey] }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function getProfitBadgeClassName(value: number | null) {
  if (value === null) {
    return "bg-muted text-muted-foreground";
  }

  return value >= 0
    ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
    : "bg-rose-500/12 text-rose-700 dark:text-rose-300";
}

function PortfolioAssetResult({ asset }: { asset: PortfolioAssetSummary }) {
  return (
    <div className="col-span-2 min-w-0 md:col-span-1 md:text-right">
      <p className="text-xs text-muted-foreground">Resultado</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 md:justify-end">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${getProfitBadgeClassName(asset.amountProfitPercentage)}`}
        >
          {formatPercentage(asset.amountProfitPercentage)}
        </span>
        <span
          className={`whitespace-nowrap text-sm font-semibold tabular-nums ${getProfitClassName(asset.amountProfit)}`}
        >
          {formatSignedCurrency(asset.amountProfit, asset.currencyCode)}
        </span>
      </div>
    </div>
  );
}

function PortfolioAssetRow({ asset }: { asset: PortfolioAssetSummary }) {
  const quantityLabel = getPortfolioAssetQuantityLabel(asset);
  const averagePriceLabel =
    asset.averagePrice !== null && Number.isFinite(asset.averagePrice)
      ? `Preço médio ${formatCurrency(asset.averagePrice, asset.currencyCode)}`
      : null;

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 transition-colors hover:bg-muted/20 md:grid-cols-[minmax(0,1fr)_7rem_8.5rem_13rem] md:items-center md:px-5 md:py-2.5">
      <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
        <AssetAvatar asset={asset} />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {getPortfolioAssetLabel(asset)}
            </p>
            {quantityLabel ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                {quantityLabel}
              </p>
            ) : null}
            {averagePriceLabel ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                {averagePriceLabel}
              </p>
            ) : null}
          </div>
          {asset.source === "manual" ? (
            asset.manualKind === "crypto" ? (
              <ManualCryptoOrderModal
                catalog={supportedCryptoAssets}
                asset={{
                  id: asset.sourceId,
                  symbol: asset.symbol,
                  name: asset.name,
                  coingeckoId: asset.coingeckoId,
                  orders: asset.orders,
                }}
                triggerLabel="Editar"
              />
            ) : (
              <ManualMarketOrderModal
                catalog={supportedMarketAssets}
                asset={{
                  id: asset.sourceId,
                  symbol: asset.symbol,
                  name: asset.name,
                  quantity: asset.quantity,
                  orders: asset.orders,
                }}
                triggerLabel="Editar"
              />
            )
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">Na carteira</p>
        <p className="mt-1 truncate text-sm font-medium tabular-nums">
          {formatPercentage(asset.percentageOfPortfolio)}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">Saldo atual</p>
        <p className="mt-1 truncate text-sm font-semibold tabular-nums">
          {formatCurrency(asset.balance, asset.currencyCode)}
        </p>
      </div>
      <PortfolioAssetResult asset={asset} />
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
    <Collapsible
      defaultOpen={false}
      className="overflow-hidden border-b last:border-b-0"
    >
      <section>
        <CollapsibleTrigger
          type="button"
          aria-label={getPortfolioCategoryToggleLabel(category.label)}
          className="group flex w-full flex-col justify-between gap-2 bg-muted/10 px-5 py-3 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:flex-row sm:items-center md:px-6"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: portfolioCategoryColors[category.key] }}
            />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">{category.label}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatCount(category.assetCount, "ativo", "ativos")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:text-right">
            <div className="flex items-baseline gap-3">
              <p className="text-sm font-semibold tabular-nums">
                {formatCurrency(category.balance, currencyCode)}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatPercentage(category.percentageOfPortfolio)}
              </p>
            </div>
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[panel-open]:rotate-180"
              strokeWidth={2}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="divide-y border-t">
            {category.assets.map((asset) => (
              <PortfolioAssetRow key={asset.id} asset={asset} />
            ))}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

function PortfolioCurrencyView({
  currency,
  showManualActions,
}: {
  currency: PortfolioCurrencyResult;
  showManualActions: boolean;
}) {
  const profitClassName = getProfitClassName(currency.amountProfit);

  return (
    <section className="space-y-4">
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
        <div className="flex flex-col gap-4 border-b px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Ativos da carteira</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Posição, participação, saldo e resultado de cada ativo.
            </p>
          </div>
          {showManualActions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
              <ManualCryptoOrderModal catalog={supportedCryptoAssets} />
              <ManualMarketOrderModal catalog={supportedMarketAssets} />
            </div>
          ) : null}
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
          ? "Confira o status da conexão no Meu Pluggy e tente atualizar novamente. Você também pode cadastrar cripto, ação, FII ou ETF manualmente."
          : "Conecte uma conta no Meu Pluggy ou cadastre cripto, ação, FII ou ETF manualmente para começar a acompanhar sua carteira."}
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
  const marketStatus = Array.isArray(params.market)
    ? params.market[0]
    : params.market;
  const statusMessage = getStatusMessage(marketStatus ?? cryptoStatus);

  return (
    <DashboardShell>
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

      {result.currencies.length > 0 ? (
        <div className="space-y-10">
          {result.currencies.map((currency, index) => (
            <PortfolioCurrencyView
              key={currency.currencyCode}
              currency={currency}
              showManualActions={index === 0}
            />
          ))}
        </div>
      ) : (
        <EmptyPortfolio hasError={Boolean(result.error)} />
      )}
    </DashboardShell>
  );
}
