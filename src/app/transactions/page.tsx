import {
  type CurrentMonthTransaction,
  getCurrentMonthTransactions,
} from "@/actions/transactions";
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

export const dynamic = "force-dynamic";

const timeZone = "America/Sao_Paulo";

const transactionTypeLabels: Record<CurrentMonthTransaction["type"], string> = {
  CREDIT: "Entrada",
  DEBIT: "Saída",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatAmount(transaction: CurrentMonthTransaction) {
  const sign = transaction.type === "CREDIT" ? "+" : "-";
  const amount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: transaction.currencyCode,
  }).format(Math.abs(transaction.amount));

  return `${sign}${amount}`;
}

function formatAccountNumber(number: string) {
  const normalizedNumber = number.replace(/\s/g, "");

  if (normalizedNumber.length <= 4) {
    return `•••• ${normalizedNumber}`;
  }

  return `•••• ${normalizedNumber.slice(-4)}`;
}

function getStatus(transaction: CurrentMonthTransaction) {
  if (transaction.status === "PENDING") {
    return {
      className: "bg-amber-500/10 text-amber-700",
      label: "Pendente",
    };
  }

  return {
    className: "bg-emerald-500/10 text-emerald-700",
    label: "Confirmada",
  };
}

function TransactionRow({
  transaction,
}: {
  transaction: CurrentMonthTransaction;
}) {
  const status = getStatus(transaction);
  const amountClassName =
    transaction.type === "CREDIT" ? "text-emerald-700" : "text-foreground";

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-4 py-4 align-top text-sm whitespace-nowrap text-muted-foreground">
        {formatDate(transaction.date)}
      </td>
      <td className="min-w-64 px-4 py-4 align-top">
        <p className="font-medium">{transaction.description}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {transaction.accountName} ·{" "}
          {formatAccountNumber(transaction.accountNumber)}
        </p>
      </td>
      <td className="px-4 py-4 align-top text-sm text-muted-foreground">
        {transaction.category || "Sem categoria"}
      </td>
      <td className="px-4 py-4 align-top">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
        >
          {status.label}
        </span>
      </td>
      <td className="px-4 py-4 text-right align-top whitespace-nowrap">
        <p className={`font-semibold ${amountClassName}`}>
          {formatAmount(transaction)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {transactionTypeLabels[transaction.type]}
        </p>
      </td>
    </tr>
  );
}

export default async function TransactionsPage() {
  const result = await getCurrentMonthTransactions();
  const creditCount = result.transactions.filter(
    (transaction) => transaction.type === "CREDIT",
  ).length;
  const debitCount = result.transactions.filter(
    (transaction) => transaction.type === "DEBIT",
  ).length;

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
                  <BreadcrumbPage>Transações</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-4 pt-0 md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Movimentações
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                Transações de {result.month.label}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Todas as movimentações das contas autorizadas no mês atual.
              </p>
            </div>
            <a
              href="/transactions"
              className="inline-flex h-9 items-center justify-center rounded-4xl border border-border bg-input/30 px-4 text-sm font-medium transition-colors hover:bg-input/50"
            >
              Atualizar
            </a>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border bg-card p-5 shadow-xs">
              <p className="text-sm text-muted-foreground">Transações no mês</p>
              <p className="mt-2 text-2xl font-semibold">
                {result.transactions.length}
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-5 shadow-xs">
              <p className="text-sm text-muted-foreground">Entradas</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">
                {creditCount}
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-5 shadow-xs">
              <p className="text-sm text-muted-foreground">Saídas</p>
              <p className="mt-2 text-2xl font-semibold">{debitCount}</p>
            </div>
          </div>

          {result.error ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
              {result.error}
            </p>
          ) : null}

          <section className="min-w-0 rounded-2xl border bg-card shadow-xs">
            <div className="flex flex-col justify-between gap-2 border-b p-5 md:flex-row md:items-center md:p-6">
              <div>
                <h2 className="text-lg font-semibold">Todas as transações</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Dados consultados diretamente na Pluggy.
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {result.accountCount}{" "}
                {result.accountCount === 1 ? "conta" : "contas"}
              </span>
            </div>

            {result.transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b text-xs tracking-wide text-muted-foreground uppercase">
                      <th scope="col" className="px-4 py-3 font-medium">
                        Data
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Descrição
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Categoria
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right font-medium"
                      >
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.transactions.map((transaction) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center">
                <p className="font-medium">Nenhuma transação encontrada</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Verifique se a conexão já sincronizou os dados ou cadastre um
                  itemId em Contas.
                </p>
                <a
                  href="/accounts"
                  className="mt-5 inline-flex h-9 items-center justify-center rounded-4xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
                >
                  Gerenciar contas
                </a>
              </div>
            )}
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
