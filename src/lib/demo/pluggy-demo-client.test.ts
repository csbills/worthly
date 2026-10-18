import { describe, expect, it } from "vitest";

import {
  createDemoPluggyClient,
  DEMO_ITEM_IDS,
  isDemoMode,
} from "./pluggy-demo-client";

const now = new Date("2026-10-18T15:00:00.000Z");

describe("isDemoMode", () => {
  it("is only enabled by WORTHLY_DEMO=1", () => {
    expect(isDemoMode({ WORTHLY_DEMO: "1" })).toBe(true);
    expect(isDemoMode({ WORTHLY_DEMO: "true" })).toBe(true);
    expect(isDemoMode({ WORTHLY_DEMO: "0" })).toBe(false);
    expect(isDemoMode({})).toBe(false);
  });
});

describe("createDemoPluggyClient", () => {
  const client = createDemoPluggyClient(now);

  it("returns checking accounts and credit cards for every demo item", async () => {
    const accounts = (
      await Promise.all(
        DEMO_ITEM_IDS.map(async (itemId) => {
          const response = await client.fetchAccounts(itemId);
          return response.results;
        }),
      )
    ).flat();

    expect(accounts.some((account) => account.type === "BANK")).toBe(true);
    expect(
      accounts.filter((account) => account.type === "CREDIT"),
    ).toHaveLength(3);
    for (const account of accounts) {
      expect(DEMO_ITEM_IDS).toContain(account.itemId);
    }
  });

  it("filters transactions by the requested period", async () => {
    const [checking] = (await client.fetchAccounts(DEMO_ITEM_IDS[0])).results;
    const all = await client.fetchAllTransactions(checking.id);
    const october = await client.fetchAllTransactions(checking.id, {
      dateFrom: "2026-10-01",
      dateTo: "2026-11-01",
    });

    expect(october.length).toBeGreaterThan(0);
    expect(october.length).toBeLessThan(all.length);
    for (const transaction of october) {
      expect(transaction.date.getTime()).toBeGreaterThanOrEqual(
        Date.parse("2026-10-01T00:00:00.000Z"),
      );
      expect(transaction.date.getTime()).toBeLessThanOrEqual(now.getTime());
    }
  });

  it("is deterministic for the same date", async () => {
    const [checking] = (await client.fetchAccounts(DEMO_ITEM_IDS[0])).results;
    const other = createDemoPluggyClient(now);

    expect(await other.fetchAllTransactions(checking.id)).toEqual(
      await client.fetchAllTransactions(checking.id),
    );
  });

  it("includes installment purchases on credit cards", async () => {
    const cards = (
      await Promise.all(
        DEMO_ITEM_IDS.map(
          async (itemId) => (await client.fetchAccounts(itemId)).results,
        ),
      )
    )
      .flat()
      .filter((account) => account.type === "CREDIT");
    const transactions = (
      await Promise.all(
        cards.map((card) => client.fetchAllTransactions(card.id)),
      )
    ).flat();

    expect(
      transactions.some(
        (transaction) =>
          (transaction.creditCardMetadata?.totalInstallments ?? 0) > 1,
      ),
    ).toBe(true);
  });

  it("returns bills, investments and the connector of an item", async () => {
    const accounts = (await client.fetchAccounts(DEMO_ITEM_IDS[0])).results;
    const card = accounts.find((account) => account.type === "CREDIT");
    const bills = await client.fetchCreditCardBills(card?.id ?? "");
    const investments = await client.fetchInvestments(DEMO_ITEM_IDS[1]);
    const item = await client.fetchItem(DEMO_ITEM_IDS[0]);

    expect(bills.results.length).toBeGreaterThan(0);
    expect(investments.results.length).toBeGreaterThan(0);
    expect(investments.totalPages).toBe(1);
    expect(item.connector.name).toBeTruthy();
  });
});
