import { Bitcoin01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CurrencyCode } from "pluggy-sdk";

import {
  type ManualCryptoAsset,
  type ManualCryptoCurrency,
  saveManualCryptoAsset,
} from "@/actions/manual-crypto-assets";
import { Button } from "@/components/ui/button";

const timeZone = "America/Sao_Paulo";

function formatCurrency(value: number, currencyCode: CurrencyCode) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
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
      text: "Criptoativo salvo. Envie o mesmo símbolo novamente para atualizar quantidade ou preços.",
    };
  }

  if (status === "invalid") {
    return {
      className: "border-amber-500/30 bg-amber-500/10 text-amber-800",
      text: "Confira o símbolo, a moeda e informe valores positivos para quantidade e preço atual.",
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
              atualize os preços quando quiser.
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="crypto-symbol" className="text-sm font-medium">
                Símbolo
              </label>
              <input
                id="crypto-symbol"
                name="symbol"
                type="text"
                required
                maxLength={12}
                placeholder="BTC"
                autoCapitalize="characters"
                className="h-9 w-full rounded-4xl border border-input bg-background px-3 text-sm uppercase outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="crypto-name" className="text-sm font-medium">
                Nome
              </label>
              <input
                id="crypto-name"
                name="name"
                type="text"
                maxLength={100}
                placeholder="Bitcoin"
                className="h-9 w-full rounded-4xl border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="crypto-currency" className="text-sm font-medium">
                Moeda dos valores
              </label>
              <select
                id="crypto-currency"
                name="currencyCode"
                defaultValue="BRL"
                className="h-9 w-full rounded-4xl border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="BRL">Real (BRL)</option>
                <option value="USD">Dólar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="crypto-quantity" className="text-sm font-medium">
                Quantidade
              </label>
              <input
                id="crypto-quantity"
                name="quantity"
                type="number"
                required
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="0,00"
                className="h-9 w-full rounded-4xl border border-input bg-background px-3 text-sm tabular-nums outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="crypto-current-price"
                className="text-sm font-medium"
              >
                Preço atual
              </label>
              <input
                id="crypto-current-price"
                name="currentPrice"
                type="number"
                required
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="0,00"
                className="h-9 w-full rounded-4xl border border-input bg-background px-3 text-sm tabular-nums outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="crypto-average-price"
                className="text-sm font-medium"
              >
                Preço médio de compra
                <span className="ml-1 font-normal text-muted-foreground">
                  (opcional)
                </span>
              </label>
              <input
                id="crypto-average-price"
                name="averagePrice"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="0,00"
                className="h-9 w-full rounded-4xl border border-input bg-background px-3 text-sm tabular-nums outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-xs text-muted-foreground">
              O preço atual é manual e precisa ser atualizado por você. O valor
              da posição será calculado como quantidade × preço atual.
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
          <table className="min-w-[760px] w-full border-collapse text-left">
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
                  Atualizado
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
                  </td>
                  <td className="px-4 py-4 text-right align-top tabular-nums whitespace-nowrap">
                    {formatQuantity(asset.quantity)}
                  </td>
                  <td className="px-4 py-4 text-right align-top tabular-nums whitespace-nowrap">
                    {formatCurrency(asset.currentPrice, asset.currencyCode)}
                  </td>
                  <td className="px-4 py-4 text-right align-top font-semibold tabular-nums whitespace-nowrap">
                    {formatCurrency(asset.balance, asset.currencyCode)}
                  </td>
                  <td
                    className={`px-4 py-4 text-right align-top font-medium tabular-nums whitespace-nowrap ${getProfitClassName(asset.amountProfit)}`}
                  >
                    {formatSignedCurrency(
                      asset.amountProfit,
                      asset.currencyCode,
                    )}
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
            Preencha o formulário acima para acompanhar uma posição de Bitcoin,
            Ethereum ou qualquer outro ativo que não venha pela Pluggy.
          </p>
        </div>
      )}
    </section>
  );
}
