"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useFormStatus } from "react-dom";

import { saveManualCryptoAsset } from "@/actions/manual-crypto-assets";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { SupportedCryptoAsset } from "@/lib/crypto-assets";

function SaveCryptoButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Salvando…" : "Salvar criptoativo"}
    </Button>
  );
}

export function ManualCryptoAssetsModal({
  assets,
}: {
  assets: readonly SupportedCryptoAsset[];
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline">
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            Adicionar criptoativo
          </Button>
        }
      />
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Adicionar criptoativo</SheetTitle>
          <SheetDescription>
            Cadastre uma posição que não veio pela Pluggy. O preço e a evolução
            serão atualizados pela CoinGecko.
          </SheetDescription>
        </SheetHeader>

        <form action={saveManualCryptoAsset} className="flex flex-1 flex-col">
          <div className="space-y-5 p-6">
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
                {assets.map((asset) => (
                  <option key={asset.coingeckoId} value={asset.coingeckoId}>
                    {asset.symbol} · {asset.name}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-5 text-muted-foreground">
                Nome, símbolo e ID CoinGecko são definidos pelo catálogo da
                aplicação.
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
                className="h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-base tabular-nums outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
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
                className="h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-base tabular-nums outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
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
                className="h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-base tabular-nums outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
              />
            </div>

            <div className="rounded-xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">Como calculamos</p>
              <p className="mt-1">
                Quantidade = (total da compra − taxa) ÷ preço de compra. O total
                informado permanece como custo original da posição.
              </p>
            </div>
          </div>

          <SheetFooter className="border-t bg-muted/10 sm:flex-row sm:justify-end">
            <SheetClose
              render={
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              }
            />
            <SaveCryptoButton />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
