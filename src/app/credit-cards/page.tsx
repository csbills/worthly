import {
  Calendar03Icon,
  CreditCardIcon,
  InformationCircleIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";

import { type CreditCardsResult, getCreditCards } from "@/actions/credit-cards";
import { AppSidebar } from "@/components/app-sidebar";
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
import {
  type CreditCardView,
  formatCreditCardDueDate,
} from "@/lib/credit-cards";

export const dynamic = "force-dynamic";

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
        <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background shadow-xs">
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
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted text-xs font-semibold text-muted-foreground"
        >
          {getInitials(card.bankName)}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-base font-semibold">{getCardTitle(card)}</p>
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
        <span className="font-semibold text-foreground">
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
            className="bg-blue-600 transition-[width] dark:bg-blue-500"
            style={{ width: `${usagePercentage}%` }}
          />
          <span
            className="bg-emerald-600 transition-[width] dark:bg-emerald-500"
            style={{ width: `${availablePercentage}%` }}
          />
        </div>
      ) : (
        <div className="mt-2 h-2.5 rounded-full bg-muted" />
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-blue-600 dark:bg-blue-500"
          />
          Usado
          <strong className="ml-1 text-foreground">
            {formatCompactCurrency(card.usedAmount, card.currencyCode)}
          </strong>
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-emerald-600 dark:bg-emerald-500"
          />
          Disponível
          <strong className="ml-1 text-emerald-700 dark:text-emerald-400">
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
    <article className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-md">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full border-[20px] border-muted/35"
      />
      <div className="relative">
        <CardBrand card={card} />

        <div className="mt-6">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span>Fatura estimada</span>
            <HugeiconsIcon
              icon={InformationCircleIcon}
              aria-label="O valor é uma estimativa baseada no saldo atual do cartão"
              className="size-3.5"
              strokeWidth={2}
            />
          </div>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {formatCurrency(card.statementAmount, card.currencyCode)}
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
            Vence{" "}
            <strong className="font-medium text-foreground">
              {formatCreditCardDueDate(card.dueDate)}
            </strong>
          </span>
        </div>

        <LimitProgress card={card} />
      </div>
    </article>
  );
}

function EmptyState({ hasError }: { hasError: boolean }) {
  return (
    <section className="rounded-2xl border border-dashed bg-card p-10 text-center shadow-xs">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <HugeiconsIcon
          icon={CreditCardIcon}
          aria-hidden="true"
          className="size-6"
          strokeWidth={2}
        />
      </div>
      <h2 className="mt-4 text-lg font-semibold">
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
        className="mt-5 inline-flex h-9 items-center justify-center rounded-4xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        Gerenciar contas
      </a>
    </section>
  );
}

function CardsContent({ result }: { result: CreditCardsResult }) {
  const currencyCode = result.cards[0]?.currencyCode ?? "BRL";

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border bg-card px-6 py-9 shadow-xs md:px-10 md:py-11">
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
            Fatura atual
          </div>
          <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums md:text-5xl">
            {formatCurrency(result.totalStatementAmount, currencyCode)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Soma estimada das faturas dos cartões conectados
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
        <h2 className="text-lg font-semibold">
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
    </>
  );
}

export default async function CreditCardsPage() {
  const result = await getCreditCards();

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
                  <BreadcrumbPage>Cartões</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-4 pt-0 md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Cartões de crédito
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Acompanhe suas faturas e o limite disponível em um só lugar.
              </p>
            </div>
            <a
              href="/credit-cards"
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

          <CardsContent result={result} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
