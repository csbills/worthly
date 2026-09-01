import { CreditCardIcon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";

import type {
  OverviewAccountBalance,
  OverviewBalances,
  OverviewCreditCardLimit,
} from "@/lib/overview-balances";

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
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

function titleCase(value: string) {
  return value
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/u)
    .filter(Boolean)
    .map(
      (word) => `${word.charAt(0).toLocaleUpperCase("pt-BR")}${word.slice(1)}`,
    )
    .join(" ");
}

function BankLogo({
  bankName,
  bankLogoPath,
}: {
  bankName: string;
  bankLogoPath: string | null;
}) {
  return bankLogoPath ? (
    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background">
      <Image
        src={bankLogoPath}
        alt=""
        width={36}
        height={36}
        className="size-full object-cover"
      />
    </span>
  ) : (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted text-[10px] font-semibold text-muted-foreground"
    >
      {getInitials(bankName)}
    </span>
  );
}

function getAmountClassName(value: number) {
  if (value < 0) {
    return "text-destructive";
  }

  return "text-foreground";
}

function AccountRow({ account }: { account: OverviewAccountBalance }) {
  return (
    <div className="flex items-center gap-3">
      <BankLogo
        bankName={account.bankName}
        bankLogoPath={account.bankLogoPath}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{account.bankName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {account.accountLabel}
        </p>
      </div>
      <p
        className={`shrink-0 text-sm font-semibold tabular-nums ${getAmountClassName(account.balance)}`}
      >
        {formatCurrency(account.balance, account.currencyCode)}
      </p>
    </div>
  );
}

function getCardTitle(card: OverviewCreditCardLimit) {
  const cardName = card.name.trim();
  const normalizedName = cardName.toLocaleLowerCase("pt-BR");
  const normalizedBankName = card.bankName.toLocaleLowerCase("pt-BR");

  if (
    !cardName ||
    normalizedName === "cartão" ||
    normalizedName === normalizedBankName
  ) {
    return card.bankName;
  }

  if (normalizedName.startsWith(`${normalizedBankName} `)) {
    return titleCase(cardName);
  }

  return `${card.bankName} ${titleCase(cardName)}`;
}

function CreditCardRow({ card }: { card: OverviewCreditCardLimit }) {
  return (
    <div className="flex items-center gap-3">
      <BankLogo bankName={card.bankName} bankLogoPath={card.bankLogoPath} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{getCardTitle(card)}</p>
        <p className="text-xs text-muted-foreground">
          •••• {card.lastFourDigits}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
          {card.availableAmount === null
            ? "Não informado"
            : formatCurrency(card.availableAmount, card.currencyCode)}
        </p>
        <p className="text-xs text-muted-foreground">disponível</p>
      </div>
    </div>
  );
}

function MoreItems({ count, label }: { count: number; label: string }) {
  if (count <= 0) {
    return null;
  }

  return (
    <p className="pl-12 text-xs text-muted-foreground">
      + {count} {label}
    </p>
  );
}

export function AccountsBalanceCard({
  overviewBalances,
}: {
  overviewBalances: OverviewBalances;
}) {
  const visibleAccounts = overviewBalances.accounts.slice(0, 4);

  return (
    <section className="col-span-12 flex min-w-0 min-h-[20rem] flex-col rounded-2xl border bg-card p-4 md:p-5 lg:col-span-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Contas correntes
          </h2>
        </div>
        <HugeiconsIcon
          icon={Wallet01Icon}
          aria-hidden="true"
          className="size-5 text-muted-foreground"
          strokeWidth={2}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p
          className={`text-2xl font-semibold tracking-[-0.03em] tabular-nums md:text-3xl ${getAmountClassName(overviewBalances.totalAccountBalance)}`}
        >
          {formatCurrency(
            overviewBalances.totalAccountBalance,
            overviewBalances.accountCurrencyCode,
          )}
        </p>
        <p className="text-sm font-medium text-muted-foreground">saldo total</p>
      </div>

      <div className="mt-5 space-y-3">
        {visibleAccounts.length > 0 ? (
          visibleAccounts.map((account) => (
            <AccountRow key={account.id} account={account} />
          ))
        ) : (
          <p className="rounded-xl bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            Nenhuma conta bancária conectada.
          </p>
        )}
        <MoreItems
          count={overviewBalances.accounts.length - visibleAccounts.length}
          label="outros bancos"
        />
      </div>

      <div className="mt-auto border-t pt-3 text-xs text-muted-foreground">
        {overviewBalances.accounts.length}{" "}
        {overviewBalances.accounts.length === 1 ? "banco" : "bancos"} ·{" "}
        {overviewBalances.totalAccountCount}{" "}
        {overviewBalances.totalAccountCount === 1 ? "conta" : "contas"}
      </div>
    </section>
  );
}

export function AvailableCreditCard({
  overviewBalances,
}: {
  overviewBalances: OverviewBalances;
}) {
  const visibleCards = overviewBalances.cards.slice(0, 3);
  const totalAvailableCredit = overviewBalances.totalAvailableCredit;
  const totalCreditLimit = overviewBalances.totalCreditLimit;

  return (
    <section className="col-span-12 flex min-w-0 min-h-[20rem] flex-col rounded-2xl border bg-card p-4 md:p-5 lg:col-span-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Limite total disponível
          </h2>
        </div>
        <HugeiconsIcon
          icon={CreditCardIcon}
          aria-hidden="true"
          className="size-5 text-muted-foreground"
          strokeWidth={2}
        />
      </div>

      <div className="mt-2">
        <p className="text-2xl font-semibold tracking-[-0.03em] tabular-nums md:text-3xl">
          {totalAvailableCredit === null
            ? "Não informado"
            : formatCurrency(
                totalAvailableCredit,
                overviewBalances.creditCurrencyCode,
              )}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {totalCreditLimit === null
            ? "Limite total não informado"
            : `de ${formatCurrency(totalCreditLimit, overviewBalances.creditCurrencyCode)} de limite total`}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {visibleCards.length > 0 ? (
          visibleCards.map((card) => (
            <CreditCardRow key={card.id} card={card} />
          ))
        ) : (
          <p className="rounded-xl bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            Nenhum cartão de crédito conectado.
          </p>
        )}
        <MoreItems
          count={overviewBalances.cards.length - visibleCards.length}
          label="outros cartões"
        />
      </div>

      <div className="mt-auto border-t pt-3 text-xs text-muted-foreground">
        {overviewBalances.cards.length}{" "}
        {overviewBalances.cards.length === 1 ? "cartão" : "cartões"}
      </div>
    </section>
  );
}
