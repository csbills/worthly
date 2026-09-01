import { getDashboardOverview } from "@/actions/dashboard";
import { CashFlowCard } from "@/components/cash-flow-card";
import { DashboardShell } from "@/components/dashboard-shell";
import { NetWorthCard } from "@/components/net-worth-card";
import {
  AccountsBalanceCard,
  AvailableCreditCard,
} from "@/components/overview-balance-cards";
import { SpendingPaceCard } from "@/components/spending-pace-card";

export const dynamic = "force-dynamic";

export default async function Page() {
  const result = await getDashboardOverview();

  return (
    <DashboardShell>
      {result.error ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
          {result.error}
        </p>
      ) : null}

      <div className="grid grid-cols-12 gap-4">
        <SpendingPaceCard
          currentMonth={result.currentMonth}
          previousMonth={result.previousMonth}
          points={result.points}
          error={result.error}
        />
        <AccountsBalanceCard overviewBalances={result.overviewBalances} />
        <AvailableCreditCard overviewBalances={result.overviewBalances} />
        <CashFlowCard
          current={result.cashFlow.current}
          previous={result.cashFlow.previous}
          currentMonthLabel={result.currentMonth.label}
          previousMonthLabel={result.previousMonth.label}
        />
        <NetWorthCard
          current={result.netWorth.current}
          history={result.netWorth.history}
          currencyCode={result.netWorth.currencyCode}
          error={result.netWorth.error}
        />
      </div>
    </DashboardShell>
  );
}
