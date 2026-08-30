export type CryptoOrderSide = "BUY" | "SELL";

export type CryptoOrder = {
  id?: string;
  side: CryptoOrderSide;
  orderDate: string;
  total: number;
  brokerFee: number;
  unitPrice: number;
  createdAt?: string;
};

export type CryptoOrderView = {
  id: string;
  side: CryptoOrderSide;
  orderDate: string;
  total: number;
  brokerFee: number;
  unitPrice: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export type CryptoPosition = {
  quantity: number;
  amountOriginal: number;
  averagePrice: number | null;
  realizedProfit: number;
  totalBought: number;
  totalSold: number;
};

const quantityEpsilon = 1e-10;

export class InsufficientCryptoQuantityError extends Error {
  constructor() {
    super("A ordem de venda excede a quantidade disponível.");
    this.name = "InsufficientCryptoQuantityError";
  }
}

export function calculateCryptoOrderQuantity(
  total: number,
  brokerFee: number,
  unitPrice: number,
) {
  return (total - brokerFee) / unitPrice;
}

function compareOrders(left: CryptoOrder, right: CryptoOrder) {
  return (
    left.orderDate.localeCompare(right.orderDate) ||
    (left.createdAt ?? left.id ?? "").localeCompare(
      right.createdAt ?? right.id ?? "",
    )
  );
}

export function sortCryptoOrders(orders: readonly CryptoOrder[]) {
  return [...orders].sort(compareOrders);
}

export function calculateCryptoPosition(
  orders: readonly CryptoOrder[],
): CryptoPosition {
  let quantity = 0;
  let amountOriginal = 0;
  let realizedProfit = 0;
  let totalBought = 0;
  let totalSold = 0;

  for (const order of sortCryptoOrders(orders)) {
    const orderQuantity = calculateCryptoOrderQuantity(
      order.total,
      order.brokerFee,
      order.unitPrice,
    );

    if (order.side === "BUY") {
      quantity += orderQuantity;
      amountOriginal += order.total;
      totalBought += order.total;
      continue;
    }

    if (orderQuantity > quantity + quantityEpsilon) {
      throw new InsufficientCryptoQuantityError();
    }

    const averagePrice =
      quantity > quantityEpsilon ? amountOriginal / quantity : 0;
    const costBasis = averagePrice * orderQuantity;

    quantity -= orderQuantity;
    amountOriginal -= costBasis;
    realizedProfit += order.total - order.brokerFee - costBasis;
    totalSold += order.total;

    if (Math.abs(quantity) <= quantityEpsilon) {
      quantity = 0;
      amountOriginal = 0;
    }
  }

  return {
    quantity,
    amountOriginal: Math.max(amountOriginal, 0),
    averagePrice: quantity > quantityEpsilon ? amountOriginal / quantity : null,
    realizedProfit,
    totalBought,
    totalSold,
  };
}
