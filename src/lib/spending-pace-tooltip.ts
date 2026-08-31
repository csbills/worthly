export type SpendingPaceTooltipSummary = {
  direction: "increase" | "decrease" | "unchanged";
  difference: number;
  percentage: number | null;
};

export function summarizeSpendingPaceTooltip(
  current: number | null | undefined,
  previous: number | null | undefined,
): SpendingPaceTooltipSummary | null {
  if (current == null || previous == null) {
    return null;
  }

  const difference = current - previous;
  const percentage =
    previous === 0
      ? null
      : Math.round((Math.abs(difference) / Math.abs(previous)) * 100);

  return {
    direction:
      difference > 0 ? "increase" : difference < 0 ? "decrease" : "unchanged",
    difference,
    percentage,
  };
}
