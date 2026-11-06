import type { Metadata } from "next";
import Link from "next/link";

import {
  assignConnectionOwner,
  createHouseholdMember,
  getHousehold,
} from "@/actions/household";
import { getOnboardingState } from "@/actions/onboarding";
import { type ConnectedAccount, getConnectedAccounts } from "@/actions/pluggy";
import {
  ConnectionList,
  CredentialsPanel,
  PluggyConnectionForm,
} from "@/components/onboarding/pluggy-forms";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { selectTriggerVariants } from "@/components/ui/select-variants";
import { getBankDisplayName, getBankLogoPath } from "@/lib/bank-assets";
import { cn } from "@/lib/utils";

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
  const [{ accounts, error }, onboarding, household] = await Promise.all([
    getConnectedAccounts(),
    getOnboardingState(),
    getHousehold(),
  ]);
  const bankAccounts = accounts.filter((account) => account.type === "BANK");
  const creditAccounts = accounts.filter(
    (account) => account.type === "CREDIT",
  );

  return (
    <>
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
                Lidas da Pluggy e atualizadas a cada 5 minutos.
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
          {household.connections.length > 0 ? (
            <Card className="gap-4">
              <div>
                <h2 className="text-sm font-medium">De quem é cada banco</h2>
                <CardDescription className="mt-0.5">
                  Conectou as contas da sua esposa, marido ou de outra pessoa da
                  casa? Diga de quem é cada uma e o plano separa renda e gastos
                  por pessoa.
                </CardDescription>
              </div>
              {household.members.length > 0 ? (
                <ul className="space-y-2">
                  {household.connections.map((connection) => (
                    <li key={connection.itemId}>
                      <form
                        action={assignConnectionOwner}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="itemId"
                          value={connection.itemId}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {connection.connectorName ?? "Banco"}
                        </span>
                        <select
                          name="memberId"
                          defaultValue={connection.memberId ?? ""}
                          aria-label={`Dono de ${connection.connectorName ?? "banco"}`}
                          className={cn(
                            selectTriggerVariants({ size: "sm" }),
                            "w-36 appearance-auto",
                          )}
                        >
                          <option value="">Sem dono</option>
                          {household.members.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" size="sm" variant="outline">
                          Salvar
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : null}
              <form
                action={createHouseholdMember}
                className="flex items-center gap-2"
              >
                <Input
                  name="name"
                  required
                  maxLength={40}
                  placeholder={
                    household.members.length ? "Mais alguém?" : "Seu nome"
                  }
                  aria-label="Nome da pessoa"
                  className="h-8"
                />
                <Button type="submit" size="sm" variant="outline">
                  Adicionar pessoa
                </Button>
              </form>
            </Card>
          ) : null}

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
    </>
  );
}
