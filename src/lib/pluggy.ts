import "server-only";
import { PluggyClient } from "pluggy-sdk";

import { prisma } from "@/lib/prisma";
import { createTtlCache } from "@/lib/ttl-cache";

/** Saved through the onboarding at /onboarding. */
export type PluggyCredentials = {
  clientId: string;
  clientSecret: string;
};

export async function getPluggyCredentials(): Promise<PluggyCredentials | null> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "default" },
    select: { pluggyClientId: true, pluggyClientSecret: true },
  });

  if (settings?.pluggyClientId && settings.pluggyClientSecret) {
    return {
      clientId: settings.pluggyClientId,
      clientSecret: settings.pluggyClientSecret,
    };
  }

  return null;
}

export function createPluggyClient({
  clientId,
  clientSecret,
}: PluggyCredentials): PluggyClient {
  return new PluggyClient({ clientId, clientSecret });
}

/**
 * Read-only calls whose results are reused for a few minutes. Every page asks
 * Pluggy for the same accounts and transactions, so switching tabs would
 * otherwise repeat the slowest part of each render.
 */
const cachedReads = new Set<string>([
  "fetchAccounts",
  "fetchAllInvestmentTransactions",
  "fetchAllTransactions",
  "fetchCreditCardBills",
  "fetchInvestments",
  "fetchItem",
]);

const PLUGGY_CACHE_TTL_MS = 5 * 60 * 1000;

const readCache = createTtlCache({ ttlMs: PLUGGY_CACHE_TTL_MS });
let clientCache: {
  key: string;
  client: PluggyClient;
  cachedClient: PluggyClient;
} | null = null;

function withReadCache(client: PluggyClient, key: string): PluggyClient {
  return new Proxy(client, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);

      if (typeof value !== "function") {
        return value;
      }

      if (typeof property === "string" && cachedReads.has(property)) {
        return (...args: unknown[]) =>
          readCache.get(`${key}:${property}:${JSON.stringify(args)}`, () =>
            value.apply(target, args),
          );
      }

      return value.bind(target);
    },
  });
}

/** Forget cached Pluggy reads, e.g. after connections or credentials change. */
export function clearPluggyCache() {
  readCache.clear();
  clientCache = null;
}

/**
 * The instance-wide Pluggy client. It is kept between requests so its API key
 * is reused instead of authenticating on every render, and its reads are
 * cached unless `fresh` is set.
 */
export async function getPluggyClient({
  fresh = false,
}: {
  fresh?: boolean;
} = {}): Promise<PluggyClient> {
  const credentials = await getPluggyCredentials();

  if (!credentials) {
    throw new Error(
      "Pluggy credentials are not configured. Finish the onboarding at /onboarding.",
    );
  }

  const key = `${credentials.clientId}:${credentials.clientSecret}`;

  if (clientCache?.key !== key) {
    readCache.clear();
    const client = createPluggyClient(credentials);
    clientCache = {
      key,
      client,
      cachedClient: withReadCache(client, credentials.clientId),
    };
  }

  return fresh ? clientCache.client : clientCache.cachedClient;
}
