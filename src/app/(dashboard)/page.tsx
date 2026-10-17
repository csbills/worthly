import { redirect } from "next/navigation";

import { getDashboardOverview } from "@/actions/dashboard";
import { getOnboardingState } from "@/actions/onboarding";
import { CashFlowCard } from "@/components/cash-flow-card";
import { NetWorthCard } from "@/components/net-worth-card";
import {
  AccountsBalanceCard,
  AvailableCreditCard,
} from "@/components/overview-balance-cards";
import { SpendingPaceCard } from "@/components/spending-pace-card";
import { Notice, PageHeader } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function getGreeting(date: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(date),
  );

  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function formatToday(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(date);

  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

export default async function Page() {
  const onboarding = await getOnboardingState();

  // A fresh deploy has nothing to show yet: walk the user through Pluggy first.
  if (!onboarding.credentials || onboarding.connections.length === 0) {
    redirect("/onboarding");
  }

  const result = await getDashboardOverview();
  const now = new Date();

  return (
    <>
      <PageHeader
        eyebrow={formatToday(now)}
        title={getGreeting(now)}
        description="Um retrato do seu dinheiro hoje: patrimônio, fluxo do mês e para onde ele está indo."
      />

      {result.error ? <Notice tone="warning">{result.error}</Notice> : null}

      <div className="grid grid-cols-12 gap-4">
        <NetWorthCard
          current={result.netWorth.current}
          history={result.netWorth.history}
          currencyCode={result.netWorth.currencyCode}
          error={result.netWorth.error}
        />
        <CashFlowCard
          current={result.cashFlow.current}
          previous={result.cashFlow.previous}
          currentMonthLabel={result.currentMonth.label}
          previousMonthLabel={result.previousMonth.label}
        />
        <SpendingPaceCard
          currentMonth={result.currentMonth}
          previousMonth={result.previousMonth}
          points={result.points}
          error={result.error}
        />
        <AccountsBalanceCard overviewBalances={result.overviewBalances} />
        <AvailableCreditCard overviewBalances={result.overviewBalances} />
      </div>
    </>
  );
}
