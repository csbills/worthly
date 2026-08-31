export type SpendingComparisonLabel = "acima" | "abaixo" | "igual";

export type SpendingComparison = {
  difference: number;
  isAbovePrevious: boolean;
  label: SpendingComparisonLabel;
  percentage: number | null;
};

function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export function getSpendingComparison(
  current: number,
  previous: number,
): SpendingComparison {
  const difference = roundToCents(current - previous);

  if (difference > 0) {
    return {
      difference,
      isAbovePrevious: true,
      label: "acima",
      percentage:
        previous > 0 ? roundToOneDecimal((difference / previous) * 100) : null,
    };
  }

  if (difference < 0) {
    return {
      difference: Math.abs(difference),
      isAbovePrevious: false,
      label: "abaixo",
      percentage:
        previous > 0
          ? roundToOneDecimal((Math.abs(difference) / previous) * 100)
          : null,
    };
  }

  return {
    difference: 0,
    isAbovePrevious: false,
    label: "igual",
    percentage: 0,
  };
}
