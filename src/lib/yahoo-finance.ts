import "server-only";

const yahooChartBaseUrl = "https://query1.finance.yahoo.com/v8/finance/chart";
const quoteCacheDuration = 300;

export type YahooPrice = {
  price: number;
  updatedAt: string | null;
};

export type YahooMarketData = {
  price?: YahooPrice;
  history: [number, number][];
};

export type YahooFetcher = (
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

function getTimestamp(value: unknown) {
  if (!isFiniteNumber(value)) {
    return null;
  }

  return value > 1_000_000_000_000 ? value : value * 1000;
}

function asIsoDate(value: unknown) {
  const timestamp = getTimestamp(value);

  if (timestamp === null) {
    return null;
  }

  const date = new Date(timestamp);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getArray(record: JsonRecord, key: string) {
  const value = record[key];

  return Array.isArray(value) ? value : [];
}

function getChartResult(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.chart)) {
    return null;
  }

  const results = payload.chart.result;

  if (!Array.isArray(results) || !isRecord(results[0])) {
    return null;
  }

  return results[0];
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toLocaleUpperCase("pt-BR");
}

function createChartUrl(symbol: string, days: number) {
  const end = Math.floor(Date.now() / 1000) + 86_400;
  const start = end - Math.max(days, 1) * 86_400;
  const url = new URL(
    `${yahooChartBaseUrl}/${encodeURIComponent(`${symbol}.SA`)}`,
  );

  url.searchParams.set("period1", String(start));
  url.searchParams.set("period2", String(end));
  url.searchParams.set("interval", "1d");
  url.searchParams.set("events", "history");
  url.searchParams.set("includeAdjustedClose", "true");

  return url;
}

async function readChartResponse(response: Response) {
  if (!response.ok) {
    throw new Error(`Yahoo Finance request failed: ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

function parseChartPayload(payload: unknown): YahooMarketData | null {
  const result = getChartResult(payload);

  if (!result) {
    return null;
  }

  const timestamps = getArray(result, "timestamp");
  const indicators = isRecord(result.indicators) ? result.indicators : {};
  const quote =
    Array.isArray(indicators.quote) && isRecord(indicators.quote[0])
      ? indicators.quote[0]
      : {};
  const adjustedClose =
    Array.isArray(indicators.adjclose) && isRecord(indicators.adjclose[0])
      ? indicators.adjclose[0]
      : {};
  const closes = getArray(quote, "close");
  const adjustedCloses = getArray(adjustedClose, "adjclose");
  const history: [number, number][] = [];

  timestamps.forEach((timestamp, index) => {
    const normalizedTimestamp = getTimestamp(timestamp);
    const adjustedValue = adjustedCloses[index];
    const closeValue = closes[index];
    const price = isFiniteNumber(adjustedValue)
      ? adjustedValue
      : isFiniteNumber(closeValue)
        ? closeValue
        : null;

    if (normalizedTimestamp !== null && price !== null) {
      history.push([normalizedTimestamp, price]);
    }
  });

  const meta = isRecord(result.meta) ? result.meta : {};
  const lastHistoryPoint = history.at(-1);
  const currentPrice = isFiniteNumber(meta.regularMarketPrice)
    ? meta.regularMarketPrice
    : lastHistoryPoint?.[1];

  if (currentPrice === undefined) {
    return history.length > 0 ? { history } : null;
  }

  return {
    price: {
      price: currentPrice,
      updatedAt:
        asIsoDate(meta.regularMarketTime) ??
        (lastHistoryPoint ? new Date(lastHistoryPoint[0]).toISOString() : null),
    },
    history,
  };
}

async function fetchYahooAsset(
  symbol: string,
  days: number,
  fetcher: YahooFetcher,
): Promise<YahooMarketData | null> {
  const response = await fetcher(createChartUrl(symbol, days).toString(), {
    next: { revalidate: quoteCacheDuration },
  });
  const payload = await readChartResponse(response);

  return parseChartPayload(payload);
}

export async function fetchYahooMarketData(
  symbols: readonly string[],
  days: number,
  fetcher: YahooFetcher = fetch,
): Promise<Record<string, YahooMarketData>> {
  const normalizedSymbols = [
    ...new Set(symbols.map(normalizeSymbol).filter(Boolean)),
  ];
  const results = await Promise.allSettled(
    normalizedSymbols.map(async (symbol) => ({
      symbol,
      data: await fetchYahooAsset(symbol, days, fetcher),
    })),
  );
  const marketData: Record<string, YahooMarketData> = {};

  for (const result of results) {
    if (result.status !== "fulfilled" || result.value.data === null) {
      continue;
    }

    marketData[result.value.symbol] = result.value.data;
  }

  return marketData;
}
