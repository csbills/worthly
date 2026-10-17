import {
  Calendar03Icon,
  CreditCardIcon,
  InformationCircleIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Metadata } from "next";
import Image from "next/image";

import { type CreditCardsResult, getCreditCards } from "@/actions/credit-cards";
import {
  getInstallments,
  type InstallmentsResult,
} from "@/actions/installments";
import { InstallmentsView } from "@/components/installments-view";
import { Notice, PageHeader } from "@/components/ui/card";
import {
  type CreditCardView,
  formatCreditCardDueDate,
} from "@/lib/credit-cards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cartões" };

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function titleCase(value: string) {
  return value
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/u)
    .filter(Boolean)
    .map((word) =>
      word.length <= 3
        ? word.toLocaleUpperCase("pt-BR")
        : `${word.charAt(0).toLocaleUpperCase("pt-BR")}${word.slice(1)}`,
    )
    .join(" ");
}

function getCardTitle(card: CreditCardView) {
  const name = card.name.trim();
  const level = card.level?.trim();

  if (!name || name.toLocaleLowerCase("pt-BR") === "cartão") {
    return `${card.bankName}${level ? ` ${titleCase(level)}` : ""}`;
  }

  const normalizedBank = card.bankName.toLocaleLowerCase("pt-BR");
  const normalizedName = name.toLocaleLowerCase("pt-BR");

  if (normalizedName === normalizedBank) {
    return `${card.bankName}${level ? ` ${titleCase(level)}` : ""}`;
  }

  if (normalizedName === level?.toLocaleLowerCase("pt-BR")) {
    return `${card.bankName} ${titleCase(name)}`;
  }

  return titleCase(name);
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

function getUsagePercentage(card: CreditCardView) {
  if (!card.creditLimit || card.creditLimit <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (card.usedAmount / card.creditLimit) * 100));
}

function CardBrand({ card }: { card: CreditCardView }) {
  return (
    <div className="flex items-center gap-3">
      {card.bankLogoPath ? (
        <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background">
          <Image
            src={card.bankLogoPath}
            alt=""
            width={44}
            height={44}
            className="size-full object-cover"
          />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted text-xs font-medium text-muted-foreground"
        >
          {getInitials(card.bankName)}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-base font-medium">{getCardTitle(card)}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {card.bankName} · •••• {card.lastFourDigits}
        </p>
      </div>
    </div>
  );
}

function LimitProgress({ card }: { card: CreditCardView }) {
  const usagePercentage = getUsagePercentage(card);
  const availablePercentage =
    card.creditLimit && card.availableAmount !== null
      ? Math.min(
          100,
          Math.max(0, (card.availableAmount / card.creditLimit) * 100),
        )
      : 0;

  return (
    <div className="mt-5 border-t pt-4">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <HugeiconsIcon
            icon={Wallet01Icon}
            aria-hidden="true"
            className="size-3.5"
            strokeWidth={2}
          />
          Limite total
        </span>
        <span className="font-medium text-foreground">
          {card.creditLimit === null
            ? "Não informado"
            : formatCompactCurrency(card.creditLimit, card.currencyCode)}
        </span>
      </div>

      {card.creditLimit !== null ? (
        <div
          className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`Limite utilizado do ${getCardTitle(card)}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(usagePercentage)}
        >
          <span
            className="bg-primary transition-[width]"
            style={{ width: `${usagePercentage}%` }}
          />
          <span
            className="bg-success transition-[width]"
            style={{ width: `${availablePercentage}%` }}
          />
        </div>
      ) : (
        <div className="mt-2 h-2.5 rounded-full bg-muted" />
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
          Usado
          <strong className="ml-1 text-foreground">
            {formatCompactCurrency(card.usedAmount, card.currencyCode)}
          </strong>
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span aria-hidden="true" className="size-2 rounded-full bg-success" />
          Disponível
          <strong className="ml-1 text-success-foreground">
            {card.availableAmount === null
              ? "Não informado"
              : formatCompactCurrency(card.availableAmount, card.currencyCode)}
          </strong>
        </span>
      </div>
    </div>
  );
}

function CreditCardItem({ card }: { card: CreditCardView }) {
  return (
    <article className="relative overflow-hidden surface p-5 transition-shadow hover:shadow-md">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full border-[20px] border-muted/35"
      />
      <div className="relative">
        <CardBrand card={card} />

        <div className="mt-6">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span>Fatura a pagar</span>
            <HugeiconsIcon
              icon={InformationCircleIcon}
              aria-label="O valor representa a fatura aberta que vence mais próximo"
              className="size-3.5"
              strokeWidth={2}
            />
          </div>
          <p className="mt-1 text-3xl font-normal tracking-[-0.03em] tabular-nums">
            {formatCurrency(card.openBalanceAmount, card.currencyCode)}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <HugeiconsIcon
            icon={Calendar03Icon}
            aria-hidden="true"
            className="size-4"
            strokeWidth={2}
          />
          <span>
            Próximo vencimento{" "}
            <strong className="font-medium text-foreground">
              {formatCreditCardDueDate(card.openDueDate)}
            </strong>
          </span>
        </div>

        {card.nextBillInProgress ? (
          <div className="mt-5 border-t pt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Próxima fatura em formação
                </p>
                <p className="mt-1 text-2xl font-normal tracking-[-0.03em] tabular-nums text-foreground">
                  {formatCurrency(
                    card.nextBillInProgress.amount,
                    card.currencyCode,
                  )}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>
                  Fecha{" "}
                  <strong className="font-medium text-foreground">
                    {formatCreditCardDueDate(
                      card.nextBillInProgress.closingDate,
                    )}
                  </strong>
                </p>
                <p className="mt-1">
                  Vence{" "}
                  <strong className="font-medium text-foreground">
                    {formatCreditCardDueDate(card.nextBillInProgress.dueDate)}
                  </strong>
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {card.nextBillInProgress.transactionCount}{" "}
              {card.nextBillInProgress.transactionCount === 1
                ? "compra após o último fechamento"
                : "compras após o último fechamento"}
            </p>
          </div>
        ) : null}

        {card.nextBillError ? (
          <p className="mt-3 text-xs text-warning-foreground">
            {card.nextBillError}
          </p>
        ) : null}

        {card.latestClosedBill ? (
          <div className="mt-4 border-t pt-3">
            <div className="flex items-start justify-between gap-4 text-xs">
              <div>
                <p className="font-medium text-muted-foreground">
                  Última fatura fechada
                </p>
                <p className="mt-1 text-base font-medium tabular-nums text-foreground">
                  {formatCurrency(
                    card.latestClosedBill.amount,
                    card.currencyCode,
                  )}
                </p>
              </div>
              <div className="text-right text-muted-foreground">
                <p>
                  Fechou{" "}
                  <strong className="font-medium text-foreground">
                    {formatCreditCardDueDate(card.latestClosedBill.closingDate)}
                  </strong>
                </p>
                <p className="mt-1">
                  Vence{" "}
                  <strong className="font-medium text-foreground">
                    {formatCreditCardDueDate(card.latestClosedBill.dueDate)}
                  </strong>
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {card.billError ? (
          <p className="mt-3 text-xs text-warning-foreground">
            {card.billError} A fatura exibida acima é apenas o saldo aberto
            retornado pela instituição.
          </p>
        ) : null}

        <LimitProgress card={card} />
      </div>
    </article>
  );
}

function EmptyState({ hasError }: { hasError: boolean }) {
  return (
    <section className="rounded-2xl border border-dashed bg-card p-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <HugeiconsIcon
          icon={CreditCardIcon}
          aria-hidden="true"
          className="size-6"
          strokeWidth={2}
        />
      </div>
      <h2 className="mt-4 text-lg font-medium">
        {hasError
          ? "Não foi possível carregar os cartões"
          : "Nenhum cartão conectado"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {hasError
          ? "Confira a conexão no Meu Pluggy e tente atualizar novamente."
          : "Conecte uma conta com cartão de crédito para acompanhar faturas e limites aqui."}
      </p>
      <a
        href="/accounts"
        className="mt-5 inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        Gerenciar contas
      </a>
    </section>
  );
}

function CardsContent({
  result,
  installmentsResult,
}: {
  result: CreditCardsResult;
  installmentsResult: InstallmentsResult;
}) {
  const currencyCode = result.cards[0]?.currencyCode ?? "BRL";

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border bg-card px-6 py-9 md:px-10 md:py-11">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 -top-28 size-64 rounded-full border-[36px] border-muted/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -right-24 size-80 rounded-full border-[44px] border-muted/15"
        />
        <div className="relative text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <HugeiconsIcon
              icon={CreditCardIcon}
              aria-hidden="true"
              className="size-4"
              strokeWidth={2}
            />
            Saldos em aberto
          </div>
          <p className="mt-2 text-4xl font-normal tracking-[-0.03em] tabular-nums md:text-5xl">
            {formatCurrency(result.totalOpenBalance, currencyCode)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Soma dos saldos em aberto dos cartões conectados
          </p>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <HugeiconsIcon
            icon={CreditCardIcon}
            aria-hidden="true"
            className="size-4"
            strokeWidth={2}
          />
        </span>
        <h2 className="text-lg font-medium">
          Seus cartões{" "}
          <span className="text-muted-foreground">({result.cards.length})</span>
        </h2>
      </div>

      {result.cards.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {result.cards.map((card) => (
            <CreditCardItem key={card.id} card={card} />
          ))}
        </div>
      ) : (
        <EmptyState hasError={Boolean(result.error)} />
      )}

      <section
        aria-labelledby="credit-cards-installments-title"
        className="space-y-4"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <HugeiconsIcon
              icon={CreditCardIcon}
              aria-hidden="true"
              className="size-4"
              strokeWidth={2}
            />
          </span>
          <h2
            id="credit-cards-installments-title"
            className="text-lg font-medium"
          >
            Parcelamentos{" "}
            <span className="text-muted-foreground">
              ({installmentsResult.installments.length})
            </span>
          </h2>
        </div>

        {installmentsResult.error ? (
          <p className="rounded-xl border border-warning/25 bg-warning/[0.08] px-4 py-3 text-sm text-warning-foreground">
            {installmentsResult.error}
          </p>
        ) : null}

        <InstallmentsView
          installments={installmentsResult.installments}
          summary={installmentsResult.summary}
        />
      </section>
    </>
  );
}

export default async function CreditCardsPage() {
  const [result, installmentsResult] = await Promise.all([
    getCreditCards(),
    getInstallments(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Crédito"
        title="Cartões"
        description="Faturas, limites e parcelamentos de todos os seus cartões em um só lugar."
      />

      {result.error ? <Notice tone="warning">{result.error}</Notice> : null}

      <CardsContent result={result} installmentsResult={installmentsResult} />
    </>
  );
}
