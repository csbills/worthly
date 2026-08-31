import "server-only";

const brapiBaseUrl =
  process.env.BRAPI_API_BASE_URL ?? "https://brapi.dev/api/v2";

const cacheDurations = {
  currentPrice: 300,
  history: 3600,
} as const;

export type BrapiAssetType = "STOCK" | "FII" | "ETF";

export type BrapiPrice = {
  price: number;
  updatedAt: string | null;
};

export type BrapiFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit & { next?: { revalidate: number } },
) => Promise<Response>;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function asIsoDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getRequestInit(revalidate: number): RequestInit & {
  next: { revalidate: number };
} {
  const token = process.env.BRAPI_API_TOKEN;

  return {
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
    next: { revalidate },
  };
}

async function readBrapiResponse(response: Response) {
  if (!response.ok) {
    throw new Error(`Brapi request failed: ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

function createUrl(path: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);

  return `${brapiBaseUrl}/${path}?${searchParams.toString()}`;
}

function getPriceEntries(payload: unknown, assetType: BrapiAssetType) {
  if (!isRecord(payload)) {
    return [];
  }

  const items = assetType === "FII" ? payload.fiis : payload.results;

  return Array.isArray(items) ? items.filter(isRecord) : [];
}

function getHistoryEntries(payload: unknown, assetType: BrapiAssetType) {
  if (!isRecord(payload)) {
    return [];
  }

  const items = assetType === "FII" ? payload.fiis : payload.results;

  return Array.isArray(items) ? items.filter(isRecord) : [];
}

export async function fetchBrapiPrices(
  symbols: readonly string[],
  assetType: BrapiAssetType,
  fetcher: BrapiFetcher = fetch,
): Promise<Record<string, BrapiPrice>> {
  if (symbols.length === 0) {
    return {};
  }

  const path = assetType === "FII" ? "fii/indicators" : "stocks/quote";
  const response = await fetcher(
    createUrl(path, { symbols: symbols.join(",") }),
    getRequestInit(cacheDurations.currentPrice),
  );
  const payload = await readBrapiResponse(response);
  const requestedAt = isRecord(payload) ? payload.requestedAt : null;
  const prices: Record<string, BrapiPrice> = {};

  for (const entry of getPriceEntries(payload, assetType)) {
    const symbol =
      typeof entry.symbol === "string"
        ? entry.symbol.toLocaleUpperCase("pt-BR")
        : null;
    const data = isRecord(entry.data) ? entry.data : entry;
    const price = assetType === "FII" ? entry.price : data.regularMarketPrice;

    if (!symbol || !isFiniteNumber(price)) {
      continue;
    }

    const updatedAt =
      assetType === "FII"
        ? asIsoDate(entry.asOfDate ?? entry.updatedAt ?? requestedAt)
        : asIsoDate(data.regularMarketTime ?? requestedAt);

    prices[symbol] = { price, updatedAt };
  }

  return prices;
}

function getHistoryStartDate(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - Math.max(days, 1));

  return date.toISOString().slice(0, 10);
}

function getHistoryDateParams(
  assetType: BrapiAssetType,
  days: number,
): Record<string, string> {
  if (assetType === "FII") {
    return {
      startDate: getHistoryStartDate(days),
      endDate: new Date().toISOString().slice(0, 10),
      sortOrder: "asc",
    };
  }

  const range = days <= 30 ? "1mo" : days <= 90 ? "3mo" : "1y";

  return { range, interval: "1d", sortOrder: "asc" };
}

function getTimestamp(value: unknown) {
  if (!isFiniteNumber(value)) {
    return null;
  }

  return value > 1_000_000_000_000 ? value : value * 1000;
}

export async function fetchBrapiMarketHistory(
  symbols: readonly string[],
  assetType: BrapiAssetType,
  days: number,
  fetcher: BrapiFetcher = fetch,
): Promise<Record<string, [number, number][]>> {
  if (symbols.length === 0) {
    return {};
  }

  const path = assetType === "FII" ? "fii/historical" : "stocks/historical";
  const response = await fetcher(
    createUrl(path, {
      symbols: symbols.join(","),
      ...getHistoryDateParams(assetType, days),
    }),
    getRequestInit(cacheDurations.history),
  );
  const payload = await readBrapiResponse(response);
  const histories: Record<string, [number, number][]> = {};

  for (const entry of getHistoryEntries(payload, assetType)) {
    const symbol =
      typeof entry.symbol === "string"
        ? entry.symbol.toLocaleUpperCase("pt-BR")
        : null;
    const data = isRecord(entry.data) ? entry.data : entry;
    const points = data.historicalDataPrice;

    if (!symbol || !Array.isArray(points)) {
      continue;
    }

    histories[symbol] = points.flatMap((point) => {
      if (!isRecord(point)) {
        return [];
      }

      const timestamp = getTimestamp(point.date);
      const price = isFiniteNumber(point.adjustedClose)
        ? point.adjustedClose
        : point.close;

      return timestamp !== null && isFiniteNumber(price)
        ? ([[timestamp, price]] as [number, number][])
        : [];
    });
  }

  return histories;
}
