"use client";

import {
  ArrowDown01Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  ChevronDownIcon,
  Clock01Icon,
  CreditCardIcon,
  InformationCircleIcon,
  ShoppingBag02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import { useMemo, useState } from "react";

import {
  type InstallmentSummary,
  type InstallmentView,
  isInstallmentPaid,
} from "@/lib/installments";

type InstallmentTab = "active" | "completed";
type InstallmentSort = "remaining" | "endDate" | "description";

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatDetailDate(value: string) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(new Date(value));
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;

  if (!day || !month || !year) {
    return formatDate(value);
  }

  const capitalizedMonth = month
    .replace(".", "")
    .replace(/^./u, (letter) => letter.toLocaleUpperCase("pt-BR"));

  return `${day} ${capitalizedMonth} de ${year}`;
}

function formatDetailMonth(value: string) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(new Date(value));
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;

  if (!month || !year) {
    return formatMonth(value);
  }

  const capitalizedMonth = month.replace(/^./u, (letter) =>
    letter.toLocaleUpperCase("pt-BR"),
  );

  return `${capitalizedMonth} ${year}`;
}

function addUtcMonths(value: string, months: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const day = date.getUTCDate();
  const result = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      1,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
  const lastDayOfMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();

  result.setUTCDate(Math.min(day, lastDayOfMonth));

  return result.toISOString();
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function getLastFourDigits(value: string | null) {
  const digits = value?.replace(/\D/gu, "");

  return digits && digits.length >= 4 ? digits.slice(-4) : null;
}

function getInitials(value: string) {
  const initials = value
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR");

  return initials || "?";
}

function InstallmentBank({ installment }: { installment: InstallmentView }) {
  const lastFourDigits = getLastFourDigits(installment.cardNumber);

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
      {installment.bankLogoPath ? (
        <span className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-background">
          <Image
            src={installment.bankLogoPath}
            alt=""
            width={16}
            height={16}
            className="size-full object-cover"
          />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="flex size-4 shrink-0 items-center justify-center rounded-full border bg-muted text-[7px] font-semibold"
        >
          {getInitials(installment.bankName)}
        </span>
      )}
      <span className="truncate">{installment.bankName}</span>
      {lastFourDigits ? <span>•••• {lastFourDigits}</span> : null}
    </span>
  );
}

function InstallmentRow({ installment }: { installment: InstallmentView }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = `installment-details-${installment.id}`;
  const statusLabel =
    installment.status === "COMPLETED" ? "Finalizado" : "Ativo";
  const installmentStartDate = installment.purchaseDate;
  const hasBillingSchedule =
    typeof installment.creditCardBilling?.dueDay === "number";
  const observedByNumber = new Map(
    installment.observedInstallments.map((observed) => [
      observed.number,
      observed,
    ]),
  );
  const installmentSchedule = Array.from(
    { length: installment.totalInstallments },
    (_, index) => {
      const number = index + 1;
      const observed = observedByNumber.get(number);

      return {
        number,
        observed,
        date: hasBillingSchedule
          ? addUtcMonths(
              installment.firstInstallmentDate,
              Math.max(number - 1, 0),
            )
          : (observed?.date ??
            addUtcMonths(installmentStartDate, Math.max(number - 1, 0))),
        amount: observed?.amount ?? installment.installmentAmount,
        isPaid: Boolean(observed && isInstallmentPaid(observed.status)),
      };
    },
  );

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <button
        type="button"
        aria-controls={panelId}
        aria-expanded={isOpen}
        className="group flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:gap-4 md:p-5"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <HugeiconsIcon
            icon={ShoppingBag02Icon}
            aria-hidden="true"
            className="size-6"
            strokeWidth={1.8}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-foreground">
              {installment.description}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                installment.status === "COMPLETED"
                  ? "bg-muted text-muted-foreground"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {statusLabel}
            </span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>
              {installment.latestInstallmentNumber}/
              {installment.totalInstallments}x
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {formatCurrency(
                installment.installmentAmount,
                installment.currencyCode,
              )}
              /mês
            </span>
            <span aria-hidden="true">·</span>
            <InstallmentBank installment={installment} />
          </span>
          <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-emerald-500 transition-[width] duration-200"
              style={{
                width: `${Math.min(installment.progressPercentage, 100)}%`,
              }}
            />
          </span>
        </span>

        <span className="hidden shrink-0 text-right sm:block">
          <span className="block font-semibold text-foreground">
            {formatCurrency(
              installment.status === "COMPLETED"
                ? installment.totalAmount
                : installment.remainingAmount,
              installment.currencyCode,
            )}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {installment.status === "COMPLETED" ? "total pago" : "restante"}
          </span>
        </span>

        <HugeiconsIcon
          icon={ChevronDownIcon}
          aria-hidden="true"
          className={`size-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          strokeWidth={2}
        />
      </button>

      {isOpen ? (
        <div id={panelId} className="border-t px-4 py-4 md:px-5 md:py-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-muted/45 p-3">
              <p className="text-xs text-muted-foreground">Total estimado</p>
              <p className="mt-1 text-base font-semibold">
                {formatCurrency(
                  installment.totalAmount,
                  installment.currencyCode,
                )}
              </p>
            </div>
            <div className="rounded-xl bg-muted/45 p-3">
              <p className="text-xs text-muted-foreground">Pago</p>
              <p className="mt-1 text-base font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(
                  installment.paidAmount,
                  installment.currencyCode,
                )}
              </p>
            </div>
            <div className="rounded-xl bg-muted/45 p-3">
              <p className="text-xs text-muted-foreground">Restante</p>
              <p className="mt-1 text-base font-semibold text-amber-600 dark:text-amber-400">
                {formatCurrency(
                  installment.remainingAmount,
                  installment.currencyCode,
                )}
              </p>
            </div>
            <div className="rounded-xl bg-muted/45 p-3">
              <p className="text-xs text-muted-foreground">Última</p>
              <p className="mt-1 text-sm font-semibold">
                {formatDetailMonth(installment.lastInstallmentDate)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-5">
            <span
              className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 font-medium"
              style={{ color: installment.categoryColor }}
            >
              <span aria-hidden="true">{installment.categoryIcon}</span>
              {installment.categoryLabel}
            </span>

            <div className="grid gap-1 sm:grid-cols-2 sm:gap-x-5">
              <p>
                Data da compra: {formatDetailDate(installment.purchaseDate)}
              </p>
              <p>
                Início do parcelamento: {formatDetailDate(installmentStartDate)}
              </p>
            </div>

            <span
              className="inline-flex items-center gap-1.5"
              title="O valor total é estimado quando a instituição não informa o total da compra."
            >
              <HugeiconsIcon
                icon={InformationCircleIcon}
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={1.8}
              />
              Total da compra estimado
            </span>
          </div>

          <div className="mt-5 border-t pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Parcelas identificadas</p>
              <p className="text-xs text-muted-foreground">
                {installment.observedInstallments.length} de{" "}
                {installment.totalInstallments}
              </p>
            </div>
            <ul
              aria-label="Parcelas da compra"
              className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1"
            >
              {installmentSchedule.map((parcel) => (
                <li
                  key={`${installment.id}-${parcel.number}`}
                  className={`grid grid-cols-[20px_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg px-3 py-2.5 text-sm sm:gap-3 ${
                    parcel.isPaid
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted/35 text-foreground"
                  }`}
                >
                  <span className="flex size-4 items-center justify-center">
                    {parcel.isPaid ? (
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={1.8}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="size-3.5 rounded-full border border-muted-foreground/70"
                      />
                    )}
                  </span>
                  <span className="font-medium">
                    {parcel.number}/{installment.totalInstallments}
                  </span>
                  <span className="text-right text-[11px] text-muted-foreground sm:text-xs">
                    {formatDetailDate(parcel.date)}
                  </span>
                  <span className="min-w-[72px] text-right font-semibold">
                    {formatCurrency(parcel.amount, installment.currencyCode)}
                  </span>
                </li>
              ))}
            </ul>
            {installment.observedInstallments.length <
            installment.latestInstallmentNumber ? (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                A instituição retornou apenas parte do histórico desta compra; o
                progresso considera o número da parcela mais recente.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function EmptyInstallments({ tab }: { tab: InstallmentTab }) {
  const isCompletedTab = tab === "completed";

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <HugeiconsIcon
          icon={CreditCardIcon}
          aria-hidden="true"
          className="size-6"
          strokeWidth={1.8}
        />
      </span>
      <h2 className="mt-4 text-base font-semibold">
        {isCompletedTab
          ? "Nenhum parcelamento finalizado"
          : "Nenhum parcelamento em andamento"}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {isCompletedTab
          ? "As compras que concluírem todas as parcelas aparecerão aqui."
          : "Quando a Pluggy identificar uma compra parcelada no cartão, ela aparecerá nesta lista."}
      </p>
    </div>
  );
}

function InstallmentSummaryPanel({ summary }: { summary: InstallmentSummary }) {
  const progressWidth = Math.min(summary.progressPercentage, 100);

  return (
    <section
      aria-labelledby="installments-summary-title"
      className="rounded-2xl border bg-card p-5 shadow-xs md:p-6"
    >
      <h2 id="installments-summary-title" className="sr-only">
        Resumo dos parcelamentos em andamento
      </h2>

      <div className="grid gap-5 md:grid-cols-4 md:gap-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HugeiconsIcon
              icon={Clock01Icon}
              aria-hidden="true"
              className="size-4 text-primary"
              strokeWidth={2}
            />
            <span>Em andamento</span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {summary.activeCount}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.activeCount === 1
              ? "compra parcelada"
              : "compras parceladas"}
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Valor total estimado</p>
          <p className="mt-2 text-xl font-semibold">
            {formatCurrency(summary.totalAmount, summary.currencyCode)}
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Já pago</p>
          <p className="mt-2 text-xl font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary.paidAmount, summary.currencyCode)}
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Restante</p>
          <p className="mt-2 text-xl font-semibold text-amber-600 dark:text-amber-400">
            {formatCurrency(summary.remainingAmount, summary.currencyCode)}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Progresso geral</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {formatPercentage(summary.progressPercentage)}% pago
          </span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Progresso geral dos parcelamentos"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressWidth}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground">
        <HugeiconsIcon
          icon={Calendar03Icon}
          aria-hidden="true"
          className="size-4"
          strokeWidth={1.8}
        />
        <span>Última parcela:</span>
        <strong className="font-medium text-foreground">
          {summary.lastInstallmentDate
            ? formatMonth(summary.lastInstallmentDate)
            : "—"}
        </strong>
      </div>
    </section>
  );
}

export function InstallmentsView({
  installments,
  summary,
}: {
  installments: InstallmentView[];
  summary: InstallmentSummary;
}) {
  const [tab, setTab] = useState<InstallmentTab>("active");
  const [showCompleted, setShowCompleted] = useState(false);
  const [sort, setSort] = useState<InstallmentSort>("remaining");

  const visibleInstallments = useMemo(() => {
    const filtered = installments.filter((installment) => {
      if (tab === "completed") {
        return installment.status === "COMPLETED";
      }

      return showCompleted || installment.status === "ACTIVE";
    });

    return [...filtered].sort((left, right) => {
      if (sort === "description") {
        return left.description.localeCompare(right.description, "pt-BR");
      }

      if (sort === "endDate") {
        return left.lastInstallmentDate.localeCompare(
          right.lastInstallmentDate,
        );
      }

      return right.remainingAmount - left.remainingAmount;
    });
  }, [installments, showCompleted, sort, tab]);

  return (
    <div className="space-y-6">
      <InstallmentSummaryPanel summary={summary} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex items-center gap-1 rounded-xl border bg-card p-1"
          role="tablist"
          aria-label="Status dos parcelamentos"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "active"}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              tab === "active"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
            onClick={() => setTab("active")}
          >
            Em andamento ({summary.activeCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "completed"}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              tab === "completed"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
            onClick={() => setTab("completed")}
          >
            Finalizadas ({summary.completedCount})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showCompleted}
              className="peer sr-only"
              onChange={(event) => setShowCompleted(event.target.checked)}
            />
            <span className="relative h-6 w-10 rounded-full bg-muted transition-colors peer-checked:bg-emerald-500/70 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
              <span className="absolute left-1 top-1 size-4 rounded-full bg-background shadow-sm transition-transform peer-checked:translate-x-4" />
            </span>
            <span>Mostrar ocultos</span>
          </label>

          <label className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              aria-hidden="true"
              className="size-4"
              strokeWidth={2}
            />
            <span className="sr-only">Ordenar por</span>
            <select
              aria-label="Ordenar por"
              value={sort}
              className="bg-transparent font-medium text-foreground outline-none"
              onChange={(event) =>
                setSort(event.target.value as InstallmentSort)
              }
            >
              <option value="remaining">Maior restante</option>
              <option value="endDate">Última parcela</option>
              <option value="description">Descrição</option>
            </select>
          </label>
        </div>
      </div>

      <section aria-label="Lista de parcelamentos" className="space-y-3">
        {visibleInstallments.length > 0 ? (
          visibleInstallments.map((installment) => (
            <InstallmentRow key={installment.id} installment={installment} />
          ))
        ) : (
          <EmptyInstallments tab={tab} />
        )}
      </section>
    </div>
  );
}
