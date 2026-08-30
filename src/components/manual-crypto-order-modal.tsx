"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { saveManualCryptoOrder } from "@/actions/manual-crypto-orders";
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
import type { CryptoOrderView } from "@/lib/crypto-orders";

type AssetOrders = {
  id: string;
  symbol: string;
  name: string;
  coingeckoId: string | null;
  orders: readonly CryptoOrderView[];
};

type OrderForm = {
  assetId: string;
  side: "BUY" | "SELL";
  orderDate: string;
  total: string;
  brokerFee: string;
  unitPrice: string;
};

function getTodayDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getInitialForm(
  asset: AssetOrders | undefined,
  catalog: readonly SupportedCryptoAsset[],
): OrderForm {
  return {
    assetId:
      asset?.coingeckoId ??
      asset?.symbol.toLocaleLowerCase("en-US") ??
      catalog[0]?.coingeckoId ??
      "",
    side: "BUY",
    orderDate: getTodayDate(),
    total: "",
    brokerFee: "0",
    unitPrice: "",
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 8,
  }).format(value);
}

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function SaveOrderButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Salvando…" : "Salvar ordem"}
    </Button>
  );
}

function OrderList({
  orders,
  onEdit,
}: {
  orders: readonly CryptoOrderView[];
  onEdit: (order: CryptoOrderView) => void;
}) {
  return (
    <div className="space-y-3 border-b p-6">
      <div>
        <p className="text-sm font-medium">Ordens cadastradas</p>
        <p className="mt-1 text-xs text-muted-foreground">
          A posição é recalculada em ordem cronológica usando custo médio.
        </p>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-2">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border bg-muted/15 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        order.side === "BUY"
                          ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                          : "bg-rose-500/12 text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      {order.side === "BUY" ? "Compra" : "Venda"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatOrderDate(order.orderDate)}
                    </span>
                  </div>
                  <p className="mt-2 truncate font-medium">
                    {formatQuantity(order.quantity)} unidades ·{" "}
                    {formatCurrency(order.total)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(order.unitPrice)} por unidade · taxa{" "}
                    {formatCurrency(order.brokerFee)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(order)}
                >
                  Editar
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Nenhuma ordem cadastrada para este ativo.
        </p>
      )}
    </div>
  );
}

export function ManualCryptoOrderModal({
  catalog,
  asset,
  triggerLabel = "Adicionar criptoativo",
}: {
  catalog: readonly SupportedCryptoAsset[];
  asset?: AssetOrders;
  triggerLabel?: string;
}) {
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [form, setForm] = useState<OrderForm>(() =>
    getInitialForm(asset, catalog),
  );
  const formPrefix = asset ? `crypto-order-${asset.id}` : "crypto-order-new";

  function resetForm() {
    setEditingOrderId(null);
    setForm(getInitialForm(asset, catalog));
  }

  function editOrder(order: CryptoOrderView) {
    setEditingOrderId(order.id);
    setForm({
      assetId:
        asset?.coingeckoId ?? asset?.symbol.toLocaleLowerCase("en-US") ?? "",
      side: order.side,
      orderDate: order.orderDate,
      total: String(order.total),
      brokerFee: String(order.brokerFee),
      unitPrice: String(order.unitPrice),
    });
  }

  function updateField(field: keyof OrderForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <Sheet
      onOpenChange={(open) => {
        if (open) {
          resetForm();
        }
      }}
    >
      <SheetTrigger
        render={
          <Button
            variant={asset ? "ghost" : "outline"}
            size={asset ? "sm" : "default"}
          >
            {!asset ? (
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            ) : null}
            {triggerLabel}
          </Button>
        }
      />
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>
            {asset ? `Ordens de ${asset.symbol}` : "Adicionar criptoativo"}
          </SheetTitle>
          <SheetDescription>
            {asset
              ? "Adicione uma compra ou venda, ou edite uma ordem existente."
              : "Cadastre a primeira ordem de um criptoativo que não veio pela Pluggy."}
          </SheetDescription>
        </SheetHeader>

        {asset ? <OrderList orders={asset.orders} onEdit={editOrder} /> : null}

        <form action={saveManualCryptoOrder} className="flex flex-1 flex-col">
          <input type="hidden" name="orderId" value={editingOrderId ?? ""} />
          {asset ? (
            <input type="hidden" name="assetId" value={form.assetId} />
          ) : null}

          <div className="space-y-5 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {editingOrderId ? "Editar ordem" : "Nova ordem"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A quantidade será calculada automaticamente.
                </p>
              </div>
              {editingOrderId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                >
                  Cancelar edição
                </Button>
              ) : null}
            </div>

            {!asset ? (
              <div className="space-y-2">
                <label
                  htmlFor={`${formPrefix}-asset`}
                  className="text-sm font-medium"
                >
                  Ativo
                </label>
                <select
                  id={`${formPrefix}-asset`}
                  name="assetId"
                  required
                  value={form.assetId}
                  onChange={(event) =>
                    updateField("assetId", event.target.value)
                  }
                  className="h-9 w-full rounded-4xl border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {catalog.map((catalogAsset) => (
                    <option
                      key={catalogAsset.coingeckoId}
                      value={catalogAsset.coingeckoId}
                    >
                      {catalogAsset.symbol} · {catalogAsset.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor={`${formPrefix}-side`}
                  className="text-sm font-medium"
                >
                  Operação
                </label>
                <select
                  id={`${formPrefix}-side`}
                  name="side"
                  required
                  value={form.side}
                  onChange={(event) =>
                    updateField("side", event.target.value as OrderForm["side"])
                  }
                  className="h-9 w-full rounded-4xl border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="BUY">Compra</option>
                  <option value="SELL">Venda</option>
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={`${formPrefix}-date`}
                  className="text-sm font-medium"
                >
                  Data da ordem
                </label>
                <input
                  id={`${formPrefix}-date`}
                  name="orderDate"
                  type="date"
                  required
                  value={form.orderDate}
                  onChange={(event) =>
                    updateField("orderDate", event.target.value)
                  }
                  className="h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-sm tabular-nums outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`${formPrefix}-total`}
                className="text-sm font-medium"
              >
                Total da ordem (BRL, com taxa)
              </label>
              <input
                id={`${formPrefix}-total`}
                name="total"
                type="number"
                required
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                value={form.total}
                onChange={(event) => updateField("total", event.target.value)}
                className="h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-base tabular-nums outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`${formPrefix}-fee`}
                className="text-sm font-medium"
              >
                Taxa da corretora (BRL)
              </label>
              <input
                id={`${formPrefix}-fee`}
                name="brokerFee"
                type="number"
                required
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.brokerFee}
                onChange={(event) =>
                  updateField("brokerFee", event.target.value)
                }
                className="h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-base tabular-nums outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`${formPrefix}-unit-price`}
                className="text-sm font-medium"
              >
                Preço por unidade (BRL)
              </label>
              <input
                id={`${formPrefix}-unit-price`}
                name="unitPrice"
                type="number"
                required
                min="0.00000001"
                step="any"
                inputMode="decimal"
                placeholder="0,00"
                value={form.unitPrice}
                onChange={(event) =>
                  updateField("unitPrice", event.target.value)
                }
                className="h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-base tabular-nums outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
              />
            </div>

            <div className="rounded-xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">Como calculamos</p>
              <p className="mt-1">
                Quantidade = (total da ordem − taxa) ÷ preço por unidade. Nas
                vendas, o custo médio vigente é baixado e o lucro realizado fica
                registrado.
              </p>
            </div>
          </div>

          <SheetFooter className="border-t bg-muted/10 sm:flex-row sm:justify-end">
            <SheetClose
              render={
                <Button type="button" variant="outline">
                  Fechar
                </Button>
              }
            />
            <SaveOrderButton />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
