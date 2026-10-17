"use server";

import type { Account } from "pluggy-sdk";
import { verifySession } from "@/lib/auth/dal";
import { getPluggyClient } from "@/lib/pluggy";
import { prisma } from "@/lib/prisma";

export type ConnectedAccount = Pick<
  Account,
  | "id"
  | "itemId"
  | "type"
  | "subtype"
  | "number"
  | "balance"
  | "name"
  | "marketingName"
  | "currencyCode"
  | "creditData"
>;

export type ConnectedAccountsResult = {
  itemCount: number;
  accounts: ConnectedAccount[];
  error: string | null;
};

function serializeAccount(account: Account): ConnectedAccount {
  return {
    id: account.id,
    itemId: account.itemId,
    type: account.type,
    subtype: account.subtype,
    number: account.number,
    balance: account.balance,
    name: account.name,
    marketingName: account.marketingName,
    currencyCode: account.currencyCode,
    creditData: account.creditData ?? null,
  };
}

export async function getConnectedAccounts(): Promise<ConnectedAccountsResult> {
  await verifySession();

  const items = await prisma.pluggyItem.findMany({
    select: { itemId: true },
    orderBy: { createdAt: "asc" },
  });

  if (items.length === 0) {
    return { itemCount: 0, accounts: [], error: null };
  }

  try {
    const client = await getPluggyClient();
    const accountResults = await Promise.allSettled(
      items.map(async ({ itemId }) => {
        const response = await client.fetchAccounts(itemId);
        return response.results.map(serializeAccount);
      }),
    );

    const accounts = accountResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
    const hasError = accountResults.some(
      (result) => result.status === "rejected",
    );

    return {
      itemCount: items.length,
      accounts,
      error: hasError
        ? "Não foi possível carregar uma ou mais conexões. Verifique o status no Meu Pluggy."
        : null,
    };
  } catch {
    return {
      itemCount: items.length,
      accounts: [],
      error: "Não foi possível autenticar ou consultar a Pluggy.",
    };
  }
}
