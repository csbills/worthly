import "server-only";

const coinGeckoBaseUrl =
  process.env.COINGECKO_API_BASE_URL ?? "https://api.coingecko.com/api/v3";
const cacheDurations = {
  currentPrice: 300,
  history: 3600,
} as const;

type CoinGeckoRequestInit = RequestInit & {
  next?: {
    revalidate: number;
  };
};

export type CoinGeckoFetcher = (
  input: RequestInfo | URL,
  init?: CoinGeckoRequestInit,
) => Promise<Response>;

export type CoinGeckoPrice = {
  price: number;
  updatedAt: string | null;
};

function getRequestInit(revalidate: number): CoinGeckoRequestInit {
  const apiKey = process.env.COINGECKO_API_KEY;

  return {
    ...(apiKey ? { headers: { "x-cg-demo-api-key": apiKey } } : {}),
    next: { revalidate },
  };
}

function getIsoDateFromUnixSeconds(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

async function readCoinGeckoResponse(response: Response) {
  if (!response.ok) {
    throw new Error(`CoinGecko request failed: ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

export async function fetchCoinGeckoPrices(
  ids: readonly string[],
  currencyCode: string,
  fetcher: CoinGeckoFetcher = fetch,
): Promise<Record<string, CoinGeckoPrice>> {
  if (ids.length === 0) {
    return {};
  }

  const params = new URLSearchParams({
    ids: ids.join(","),
    vs_currencies: currencyCode.toLocaleLowerCase("en-US"),
    include_last_updated_at: "true",
  });
  const response = await fetcher(
    `${coinGeckoBaseUrl}/simple/price?${params.toString()}`,
    getRequestInit(cacheDurations.currentPrice),
  );
  const payload = await readCoinGeckoResponse(response);

  if (!isRecord(payload)) {
    return {};
  }

  const prices: Record<string, CoinGeckoPrice> = {};
  const currency = currencyCode.toLocaleLowerCase("en-US");

  for (const id of ids) {
    const coin = payload[id];

    if (!isRecord(coin) || !isFiniteNumber(coin[currency])) {
      continue;
    }

    prices[id] = {
      price: coin[currency],
      updatedAt: getIsoDateFromUnixSeconds(coin.last_updated_at),
    };
  }

  return prices;
}

export async function fetchCoinGeckoMarketChart(
  id: string,
  currencyCode: string,
  days: number,
  fetcher: CoinGeckoFetcher = fetch,
): Promise<[number, number][]> {
  const params = new URLSearchParams({
    vs_currency: currencyCode.toLocaleLowerCase("en-US"),
    days: String(days),
    interval: "daily",
  });
  const response = await fetcher(
    `${coinGeckoBaseUrl}/coins/${encodeURIComponent(id)}/market_chart?${params.toString()}`,
    getRequestInit(cacheDurations.history),
  );
  const payload = await readCoinGeckoResponse(response);

  if (!isRecord(payload) || !Array.isArray(payload.prices)) {
    return [];
  }

  return payload.prices.filter(
    (point): point is [number, number] =>
      Array.isArray(point) &&
      point.length >= 2 &&
      isFiniteNumber(point[0]) &&
      isFiniteNumber(point[1]),
  );
}
