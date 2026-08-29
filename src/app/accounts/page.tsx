import {
  type ConnectedAccount,
  getConnectedAccounts,
  savePluggyItem,
} from "@/actions/pluggy";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export const dynamic = "force-dynamic";

type AccountsPageProps = {
  searchParams: Promise<{
    status?: string | string[];
  }>;
};

const accountTypeLabels: Record<ConnectedAccount["type"], string> = {
  BANK: "Conta bancária",
  CREDIT: "Cartão de crédito",
};

const accountSubtypeLabels: Record<ConnectedAccount["subtype"], string> = {
  CHECKING_ACCOUNT: "Conta corrente",
  SAVINGS_ACCOUNT: "Conta poupança",
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

  if (normalizedNumber.length <= 4) {
    return `•••• ${normalizedNumber}`;
  }

  return `•••• ${normalizedNumber.slice(-4)}`;
}

function getStatusMessage(status: string | undefined) {
  switch (status) {
    case "saved":
      return {
        className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
        text: "Conexão salva. As contas serão consultadas nesta página.",
      };
    case "invalid-item":
      return {
        className: "border-destructive/30 bg-destructive/10 text-destructive",
        text: "Informe um itemId válido do Meu Pluggy.",
      };
    case "save-error":
      return {
        className: "border-destructive/30 bg-destructive/10 text-destructive",
        text: "Não foi possível salvar essa conexão.",
      };
    default:
      return null;
  }
}

function AccountCard({ account }: { account: ConnectedAccount }) {
  const title = account.marketingName || account.name || "Conta sem nome";

  return (
    <article className="rounded-2xl border bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {accountTypeLabels[account.type]}
          </p>
          <h2 className="mt-2 truncate text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {accountSubtypeLabels[account.subtype]} ·{" "}
            {formatAccountNumber(account.number)}
          </p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {account.currencyCode}
        </span>
      </div>
      <p className="mt-8 text-2xl font-semibold tracking-tight">
        {formatBalance(account.balance, account.currencyCode)}
      </p>
    </article>
  );
}

export default async function AccountsPage({
  searchParams,
}: AccountsPageProps) {
  const [{ accounts, itemCount, error }, params] = await Promise.all([
    getConnectedAccounts(),
    searchParams,
  ]);
  const status = typeof params.status === "string" ? params.status : undefined;
  const statusMessage = getStatusMessage(status);

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
                  <BreadcrumbPage>Contas conectadas</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-4 pt-0 md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Conexões
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                Contas conectadas
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Gerencie os itens do Meu Pluggy e consulte as contas autorizadas
                para esta aplicação.
              </p>
            </div>
            <div className="rounded-2xl border bg-card px-4 py-3 shadow-xs">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Conexões cadastradas
              </p>
              <p className="mt-1 text-2xl font-semibold">{itemCount}</p>
            </div>
          </div>

          {statusMessage ? (
            <p
              className={`rounded-xl border px-4 py-3 text-sm ${statusMessage.className}`}
            >
              {statusMessage.text}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
              {error}
            </p>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="min-w-0 rounded-2xl border bg-card p-5 shadow-xs md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Suas contas</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dados consultados diretamente na Pluggy.
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {accounts.length} {accounts.length === 1 ? "conta" : "contas"}
                </span>
              </div>

              {accounts.length > 0 ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {accounts.map((account) => (
                    <AccountCard key={account.id} account={account} />
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed p-8 text-center">
                  <p className="font-medium">Nenhuma conta disponível</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Cadastre um itemId do Meu Pluggy ao lado para carregar as
                    contas dessa conexão.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border bg-card p-5 shadow-xs md:p-6">
              <p className="text-sm font-medium text-muted-foreground">
                Nova conexão
              </p>
              <h2 className="mt-1 text-lg font-semibold">Adicionar itemId</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Cole aqui o identificador da conexão autorizado para esta
                aplicação no Meu Pluggy.
              </p>

              <form action={savePluggyItem} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="itemId" className="text-sm font-medium">
                    Item ID
                  </label>
                  <Input
                    id="itemId"
                    name="itemId"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    required
                    spellCheck={false}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Salvar conexão
                </Button>
              </form>

              <p className="mt-5 text-xs leading-5 text-muted-foreground">
                A API Key permanece no servidor. O itemId é apenas a referência
                usada para consultar os dados.
              </p>
            </section>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
