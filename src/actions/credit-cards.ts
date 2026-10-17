"use server";

import type { PluggyClient } from "pluggy-sdk";
import { type ConnectedAccount, getConnectedAccounts } from "@/actions/pluggy";
import { getPluggyClient } from "@/lib/pluggy";
import { getBankDisplayName, getBankLogoPath } from "../lib/bank-assets";
import {
  type CreditCardBankDetails,
  type CreditCardView,
  normalizeCreditCard,
} from "../lib/credit-cards";

export type CreditCardsResult = {
  cards: CreditCardView[];
  totalOpenBalance: number;
  error: string | null;
};

function resolveBankDetails(
  accounts: ConnectedAccount[],
  connectorName?: string | null,
): CreditCardBankDetails {
  const identities = [
    connectorName,
    ...accounts.flatMap((account) => [account.name, account.marketingName]),
  ];
  const bankName = getBankDisplayName(...identities);

  return {
    bankName,
    bankLogoPath: getBankLogoPath(...identities),
  };
}

function getFallbackBankDetails(
  accounts: ConnectedAccount[],
): CreditCardBankDetails {
  return resolveBankDetails(accounts);
}

async function getBankDetails(
  client: PluggyClient,
  accounts: ConnectedAccount[],
): Promise<CreditCardBankDetails> {
  const fallback = getFallbackBankDetails(accounts);

  try {
    const item = await client.fetchItem(accounts[0].itemId);

    return resolveBankDetails(accounts, item.connector?.name);
  } catch {
    return fallback;
  }
}

function isCreditCard(account: ConnectedAccount) {
  return account.type === "CREDIT" || account.subtype === "CREDIT_CARD";
}

export async function getCreditCards(): Promise<CreditCardsResult> {
  const accountResult = await getConnectedAccounts();
  const creditAccounts = accountResult.accounts.filter(isCreditCard);

  if (creditAccounts.length === 0) {
    return {
      cards: [],
      totalOpenBalance: 0,
      error: accountResult.error,
    };
  }

  try {
    const client = await getPluggyClient();
    const accountsByItemId = new Map<string, ConnectedAccount[]>();

    for (const account of accountResult.accounts) {
      const accountsForItem = accountsByItemId.get(account.itemId) ?? [];
      accountsForItem.push(account);
      accountsByItemId.set(account.itemId, accountsForItem);
    }

    const bankDetailsByItemId = new Map<
      string,
      Promise<CreditCardBankDetails>
    >();
    const getBankDetailsForAccount = (account: ConnectedAccount) => {
      const existingDetails = bankDetailsByItemId.get(account.itemId);

      if (existingDetails) {
        return existingDetails;
      }

      const details = getBankDetails(
        client,
        accountsByItemId.get(account.itemId) ?? [account],
      );
      bankDetailsByItemId.set(account.itemId, details);

      return details;
    };

    const now = new Date();
    const cards = await Promise.all(
      creditAccounts.map(async (account) => {
        const bankDetails = await getBankDetailsForAccount(account);
        const [billsResult, transactionsResult] = await Promise.allSettled([
          client.fetchCreditCardBills(account.id, {
            pageSize: 500,
          }),
          client.fetchAllTransactions(account.id),
        ]);
        const bills =
          billsResult.status === "fulfilled" ? billsResult.value.results : [];
        const transactions =
          transactionsResult.status === "fulfilled"
            ? transactionsResult.value
            : [];

        return normalizeCreditCard(
          account,
          bankDetails,
          bills,
          now,
          billsResult.status === "rejected"
            ? "Histórico de faturas não disponível para este cartão."
            : null,
          transactions,
          transactionsResult.status === "rejected"
            ? "Compras da próxima fatura não disponíveis para este cartão."
            : null,
        );
      }),
    );

    return {
      cards,
      totalOpenBalance: cards.reduce(
        (total, card) => total + card.openBalanceAmount,
        0,
      ),
      error: accountResult.error,
    };
  } catch {
    return {
      cards: [],
      totalOpenBalance: 0,
      error: "Não foi possível consultar os cartões na Pluggy.",
    };
  }
}
