import type { Metadata } from "next";
import Link from "next/link";

import { getOnboardingState } from "@/actions/onboarding";
import { type ConnectedAccount, getConnectedAccounts } from "@/actions/pluggy";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  ConnectionList,
  CredentialsPanel,
  PluggyConnectionForm,
} from "@/components/onboarding/pluggy-forms";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
} from "@/components/ui/card";
import { getBankDisplayName, getBankLogoPath } from "@/lib/bank-assets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Conexões" };

const accountSubtypeLabels: Record<ConnectedAccount["subtype"], string> = {
  CHECKING_ACCOUNT: "Conta corrente",
  SAVINGS_ACCOUNT: "Poupança",
  CREDIT_CARD: "Cartão de crédito",
};

function formatBalance(
  balance: number,
  currencyCode: ConnectedAccount["currencyCode"],
) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
  }).format(balance);
}

function formatAccountNumber(number: string) {
  const normalizedNumber = number.replace(/\s/g, "");

  return `•••• ${normalizedNumber.slice(-4)}`;
}

function AccountRow({ account }: { account: ConnectedAccount }) {
  const title = account.marketingName || account.name || "Conta sem nome";
  const logoPath = getBankLogoPath(account.marketingName, account.name);
  const bankName = getBankDisplayName(account.marketingName, account.name);

  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      {logoPath ? (
        // biome-ignore lint/performance/noImgElement: tiny static bank logo
        <img
          src={logoPath}
          alt=""
          className="size-8 shrink-0 rounded-lg border bg-background object-cover"
        />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
          {bankName.slice(0, 1)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {accountSubtypeLabels[account.subtype]} ·{" "}
          {formatAccountNumber(account.number)}
        </p>
      </div>
      <p
        className={`shrink-0 text-sm font-medium tabular-nums ${
          account.balance < 0 ? "text-destructive-foreground" : ""
        }`}
      >
        {formatBalance(account.balance, account.currencyCode)}
      </p>
    </li>
  );
}

export default async function AccountsPage() {
  const [{ accounts, error }, onboarding] = await Promise.all([
    getConnectedAccounts(),
    getOnboardingState(),
  ]);
  const bankAccounts = accounts.filter((account) => account.type === "BANK");
  const creditAccounts = accounts.filter(
    (account) => account.type === "CREDIT",
  );

  return (
    <DashboardShell>
      <PageHeader
        eyebrow="Configurações"
        title="Conexões"
        description="Os bancos autorizados no Meu Pluggy e a aplicação Pluggy que esta instância usa para lê-los."
        actions={
          <Link
            href="/onboarding"
            className={buttonVariants({ variant: "outline" })}
          >
            Abrir configuração guiada
          </Link>
        }
      />

      {error ? <Notice tone="warning">{error}</Notice> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="surface min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
            <div>
              <h2 className="text-sm font-medium">Contas importadas</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Lidas diretamente da Pluggy a cada visita.
              </p>
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">
              {accounts.length} {accounts.length === 1 ? "conta" : "contas"}
            </span>
          </div>

          {accounts.length > 0 ? (
            [
              { label: "Contas bancárias", items: bankAccounts },
              { label: "Cartões de crédito", items: creditAccounts },
            ]
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <div key={group.label}>
                  <p className="border-b bg-muted px-5 py-2 text-xs text-muted-foreground">
                    {group.label}
                  </p>
                  <ul className="divide-y">
                    {group.items.map((account) => (
                      <AccountRow key={account.id} account={account} />
                    ))}
                  </ul>
                </div>
              ))
          ) : (
            <div className="p-5">
              <EmptyState
                title="Nenhuma conta importada ainda"
                description="Adicione o Item ID de um banco autorizado no Meu Pluggy para importar as contas dele."
              />
            </div>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="gap-4">
            <CardHeader>
              <div>
                <h2 className="text-sm font-medium">Bancos conectados</h2>
                <CardDescription className="mt-0.5">
                  Um Item ID por banco autorizado na Demo da Pluggy.
                </CardDescription>
              </div>
            </CardHeader>
            <ConnectionList connections={onboarding.connections} />
            {onboarding.credentials ? (
              <PluggyConnectionForm />
            ) : (
              <p className="text-sm text-muted-foreground">
                Configure as credenciais abaixo para adicionar bancos.
              </p>
            )}
          </Card>

          <Card className="gap-4">
            <div>
              <h2 className="text-sm font-medium">Aplicação Pluggy</h2>
              <CardDescription className="mt-0.5">
                Client ID e Client Secret da aplicação criada no dashboard da
                Pluggy.
              </CardDescription>
            </div>
            <CredentialsPanel credentials={onboarding.credentials} />
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
