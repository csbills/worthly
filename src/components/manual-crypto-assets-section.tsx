import { Bitcoin01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CurrencyCode } from "pluggy-sdk";

import {
  type ManualCryptoAsset,
  type ManualCryptoCurrency,
  saveManualCryptoAsset,
} from "@/actions/manual-crypto-assets";
import { CryptoPerformanceChart } from "@/components/crypto-performance-chart";
import { Button } from "@/components/ui/button";
import { supportedCryptoAssets } from "@/lib/crypto-assets";

const timeZone = "America/Sao_Paulo";

function formatCurrency(value: number, currencyCode: CurrencyCode) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNullableCurrency(
  value: number | null,
  currencyCode: CurrencyCode,
) {
  return value === null ? "Indisponível" : formatCurrency(value, currencyCode);
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 8,
  }).format(value);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatSignedCurrency(
  value: number | null,
  currencyCode: ManualCryptoCurrency,
) {
  if (value === null) {
    return "Sem base de custo";
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
    return null;
  }

  const formatted = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Math.abs(value));

  return `${value >= 0 ? "+" : "-"}${formatted}%`;
}

function formatResult(asset: ManualCryptoAsset) {
  if (asset.currentPrice === null) {
    return "Preço indisponível";
  }

  if (asset.amountProfit === null) {
    return "Sem base de custo";
  }

  const percentage = formatPercentage(asset.amountProfitPercentage);

  return `${formatSignedCurrency(asset.amountProfit, asset.currencyCode)}${percentage ? ` (${percentage})` : ""}`;
}

function getProfitClassName(value: number | null) {
  if (value === null) {
    return "text-muted-foreground";
  }

  return value >= 0 ? "text-emerald-700" : "text-destructive";
}

function getStatusMessage(status: string | undefined) {
  if (status === "saved") {
    return {
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800",
      text: "Criptoativo salvo. Quantidade e preço médio foram calculados; preço e histórico serão atualizados pela CoinGecko.",
    };
  }

  if (status === "invalid") {
    return {
      className: "border-amber-500/30 bg-amber-500/10 text-amber-800",
      text: "Selecione um ativo e informe valores válidos para total da compra, taxa e preço por unidade.",
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

export function ManualCryptoAssetsSection({
  assets,
  error,
  status,
}: {
  assets: ManualCryptoAsset[];
  error: string | null;
  status?: string;
}) {
  const statusMessage = getStatusMessage(status);

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div className="flex flex-col justify-between gap-3 border-b p-5 md:flex-row md:items-center md:p-6">
        <div className="flex items-start gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white"
            aria-hidden="true"
          >
            <HugeiconsIcon
              icon={Bitcoin01Icon}
              strokeWidth={2}
              className="size-5"
            />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Criptoativos manuais</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Cadastre posições que não foram disponibilizadas pela Pluggy e
              acompanhe o preço de mercado automaticamente.
            </p>
          </div>
        </div>
        {assets.length > 0 ? (
          <p className="text-sm font-medium text-muted-foreground">
            {assets.length} {assets.length === 1 ? "ativo" : "ativos"}
          </p>
        ) : null}
      </div>

      <div className="border-b bg-muted/20 p-5 md:p-6">
        <form action={saveManualCryptoAsset} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label htmlFor="crypto-asset" className="text-sm font-medium">
                Ativo
              </label>
              <select
                id="crypto-asset"
                name="assetId"
                required
                defaultValue="bitcoin"
                className="h-9 w-full rounded-4xl border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {supportedCryptoAssets.map((asset) => (
                  <option key={asset.coingeckoId} value={asset.coingeckoId}>
                    {asset.symbol} · {asset.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Símbolo, nome e ID CoinGecko vêm do catálogo.
              </p>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="crypto-purchase-total"
                className="text-sm font-medium"
              >
                Total da compra (BRL, com taxa)
              </label>
              <input
                id="crypto-purchase-total"
                name="purchaseTotal"
                type="number"
                required
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                className="h-9 w-full rounded-4xl border border-input bg-background px-3 text-sm tabular-nums outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="crypto-broker-fee"
                className="text-sm font-medium"
              >
                Taxa da corretora (BRL)
              </label>
              <input
                id="crypto-broker-fee"
                name="brokerFee"
                type="number"
                required
                min="0"
                step="0.01"
                inputMode="decimal"
                defaultValue="0"
                placeholder="0,00"
                className="h-9 w-full rounded-4xl border border-input bg-background px-3 text-sm tabular-nums outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="crypto-purchase-price"
                className="text-sm font-medium"
              >
                Preço de compra por unidade (BRL)
              </label>
              <input
                id="crypto-purchase-price"
                name="purchasePrice"
                type="number"
                required
                min="0.00000001"
                step="any"
                inputMode="decimal"
                placeholder="0,00"
                className="h-9 w-full rounded-4xl border border-input bg-background px-3 text-sm tabular-nums outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-xs text-muted-foreground">
              A quantidade será (total da compra − taxa) dividido pelo preço. O
              total informado será a base do custo da posição.
            </p>
            <Button type="submit" className="sm:min-w-32">
              Salvar ativo
            </Button>
          </div>
        </form>
      </div>

      {statusMessage ? (
        <p
          className={`border-b px-5 py-3 text-sm md:px-6 ${statusMessage.className}`}
          aria-live="polite"
        >
          {statusMessage.text}
        </p>
      ) : null}

      {error ? (
        <p className="border-b border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm text-amber-800 md:px-6">
          {error}
        </p>
      ) : null}

      {assets.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b text-xs tracking-wide text-muted-foreground uppercase">
                <th scope="col" className="px-4 py-3 font-medium md:px-6">
                  Ativo
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Quantidade
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Preço atual
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Saldo atual
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Resultado
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Cadastro
                </th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr
                  key={asset.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="min-w-56 px-4 py-4 align-top md:px-6">
                    <p className="font-semibold">{asset.symbol}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {asset.name}
                    </p>
                    {asset.purchaseTotal !== null ? (
                      <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                        Compra{" "}
                        {formatCurrency(
                          asset.purchaseTotal,
                          asset.currencyCode,
                        )}
                        {asset.brokerFee !== null
                          ? ` · taxa ${formatCurrency(asset.brokerFee, asset.currencyCode)}`
                          : ""}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-right align-top tabular-nums whitespace-nowrap">
                    <p>{formatQuantity(asset.quantity)}</p>
                    {asset.averagePrice !== null ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatCurrency(asset.averagePrice, asset.currencyCode)}{" "}
                        / un.
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-right align-top tabular-nums whitespace-nowrap">
                    <p>
                      {formatNullableCurrency(
                        asset.currentPrice,
                        asset.currencyCode,
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {asset.priceSource ?? "Fonte não configurada"}
                      {asset.priceUpdatedAt
                        ? ` · ${formatDate(asset.priceUpdatedAt)}`
                        : ""}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right align-top font-semibold tabular-nums whitespace-nowrap">
                    {formatNullableCurrency(asset.balance, asset.currencyCode)}
                  </td>
                  <td
                    className={`px-4 py-4 text-right align-top font-medium tabular-nums whitespace-nowrap ${getProfitClassName(asset.amountProfit)}`}
                  >
                    {formatResult(asset)}
                  </td>
                  <td className="px-4 py-4 text-right align-top text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(asset.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="font-medium">Nenhum criptoativo manual cadastrado</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Preencha o formulário acima para acompanhar uma posição do catálogo
            que não venha pela Pluggy.
          </p>
        </div>
      )}

      {assets.some((asset) => asset.history.length > 0) ? (
        <div className="border-t p-5 md:p-6">
          <div>
            <h3 className="font-semibold">Evolução das posições</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Valor estimado dos últimos 30 dias usando o preço de mercado e a
              quantidade calculada a partir da compra.
            </p>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {assets
              .filter((asset) => asset.history.length > 0)
              .map((asset) => (
                <article
                  key={asset.id}
                  className="rounded-xl border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{asset.symbol}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {asset.name}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {asset.history.length} pontos
                    </p>
                  </div>
                  <div className="mt-4">
                    <CryptoPerformanceChart
                      history={asset.history}
                      currencyCode={asset.currencyCode}
                    />
                  </div>
                </article>
              ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
