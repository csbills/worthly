export type NetWorthInput = {
  accountBalance: number;
  investmentBalance: number;
  creditUsed: number;
};

export type NetWorthBreakdown = NetWorthInput & {
  netWorth: number;
};

export type NetWorthChange = {
  difference: number;
  percentage: number | null;
  direction: "increase" | "decrease" | "unchanged";
};

function roundAmount(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateNetWorth({
  accountBalance,
  investmentBalance,
  creditUsed,
}: NetWorthInput): NetWorthBreakdown {
  return {
    accountBalance: roundAmount(accountBalance),
    investmentBalance: roundAmount(investmentBalance),
    creditUsed: roundAmount(creditUsed),
    netWorth: roundAmount(accountBalance + investmentBalance - creditUsed),
  };
}

export function compareNetWorth(
  current: number,
  previous: number,
): NetWorthChange {
  const difference = roundAmount(current - previous);
  const percentage =
    previous === 0 ? null : (difference / Math.abs(previous)) * 100;

  return {
    difference,
    percentage: percentage === null ? null : roundAmount(percentage),
    direction:
      difference > 0 ? "increase" : difference < 0 ? "decrease" : "unchanged",
  };
}
