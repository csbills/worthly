export type CryptoPurchaseInput = {
  purchaseTotal: number;
  brokerFee: number;
  purchasePrice: number;
};

export type CryptoPurchase = {
  quantity: number;
  averagePrice: number;
  amountOriginal: number;
};

export type CryptoPerformanceInput = {
  quantity: number;
  averagePrice: number | null;
  currentPrice: number | null;
};

export type CryptoPerformance = {
  balance: number | null;
  amountOriginal: number | null;
  amountProfit: number | null;
  amountProfitPercentage: number | null;
};

export type CryptoHistoryPoint = {
  date: string;
  price: number;
  balance: number;
};

export function calculateCryptoPurchase({
  purchaseTotal,
  brokerFee,
  purchasePrice,
}: CryptoPurchaseInput): CryptoPurchase {
  const quantity = (purchaseTotal - brokerFee) / purchasePrice;
  const amountOriginal = purchaseTotal;

  return {
    quantity,
    averagePrice: amountOriginal / quantity,
    amountOriginal,
  };
}

export function calculateCryptoPerformance({
  quantity,
  averagePrice,
  currentPrice,
}: CryptoPerformanceInput): CryptoPerformance {
  const balance = currentPrice === null ? null : quantity * currentPrice;
  const amountOriginal = averagePrice === null ? null : quantity * averagePrice;
  const amountProfit =
    balance === null || amountOriginal === null
      ? null
      : balance - amountOriginal;
  const amountProfitPercentage =
    amountProfit === null || amountOriginal === null || amountOriginal <= 0
      ? null
      : (amountProfit / amountOriginal) * 100;

  return {
    balance,
    amountOriginal,
    amountProfit,
    amountProfitPercentage,
  };
}

export function mapMarketChartToHistory(
  prices: readonly (readonly [number, number])[],
  quantity: number,
): CryptoHistoryPoint[] {
  return prices
    .filter(
      ([timestamp, price]) =>
        Number.isFinite(timestamp) && Number.isFinite(price),
    )
    .map(([timestamp, price]) => ({
      date: new Date(timestamp).toISOString(),
      price,
      balance: quantity * price,
    }));
}
