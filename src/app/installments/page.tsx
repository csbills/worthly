import { CreditCardIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { getInstallments } from "@/actions/installments";
import { DashboardShell } from "@/components/dashboard-shell";
import { InstallmentsView } from "@/components/installments-view";

export const dynamic = "force-dynamic";

export default async function InstallmentsPage() {
  const result = await getInstallments();

  return (
    <DashboardShell>
      {result.error ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {result.error}
        </p>
      ) : null}

      {result.installments.length > 0 ? (
        <InstallmentsView
          installments={result.installments}
          summary={result.summary}
        />
      ) : (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-16 text-center shadow-xs">
          <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <HugeiconsIcon
              icon={CreditCardIcon}
              aria-hidden="true"
              className="size-6"
              strokeWidth={1.8}
            />
          </span>
          <h2 className="mt-4 text-base font-semibold">
            Nenhum parcelamento encontrado
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Assim que a Pluggy identificar compras parceladas em um cartão
            conectado, elas aparecerão aqui.
          </p>
          <Link
            href="/credit-cards"
            className="mt-5 inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver cartões
          </Link>
        </section>
      )}
    </DashboardShell>
  );
}
