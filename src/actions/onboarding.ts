"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Item, PluggyClient } from "pluggy-sdk";
import { verifySession } from "@/lib/auth/dal";
import {
  clearPluggyCache,
  createPluggyClient,
  getPluggyClient,
  getPluggyCredentials,
} from "@/lib/pluggy";
import { prisma } from "@/lib/prisma";
import { getBankDisplayName, getBankLogoPath } from "../lib/bank-assets";
import {
  isValidPluggyItemId,
  maskIdentifier,
  normalizePluggyItemId,
} from "../lib/onboarding";

const SETTINGS_ID = "default";

export type FormActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Echoes non-secret fields back so a failed submit keeps what was typed. */
  fields?: Record<string, string>;
};

export type PluggyConnectionSummary = {
  itemId: string;
  connectorName: string | null;
  connectorImageUrl: string | null;
  status: string | null;
};

export type OnboardingState = {
  credentials: {
    clientIdHint: string;
  } | null;
  connections: PluggyConnectionSummary[];
  completed: boolean;
};

export async function getOnboardingState(): Promise<OnboardingState> {
  await verifySession();

  const [credentials, connections, settings] = await Promise.all([
    getPluggyCredentials(),
    prisma.pluggyItem.findMany({
      select: {
        itemId: true,
        connectorName: true,
        connectorImageUrl: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.appSettings.findUnique({
      where: { id: SETTINGS_ID },
      select: { onboardingCompletedAt: true },
    }),
  ]);

  return {
    credentials: credentials
      ? { clientIdHint: maskIdentifier(credentials.clientId) }
      : null,
    connections: credentials
      ? await backfillConnectionDetails(connections)
      : connections,
    completed: Boolean(settings?.onboardingCompletedAt),
  };
}

type ConnectionDetails = Omit<PluggyConnectionSummary, "itemId">;

/**
 * MeuPluggy items all report the "MeuPluggy" connector, so the bank is read
 * from the item's accounts — the same identities the dashboard uses.
 */
async function describeItem(
  client: PluggyClient,
  item: Item,
): Promise<ConnectionDetails> {
  let accountNames: Array<string | null> = [];
  try {
    const accounts = await client.fetchAccounts(item.id);
    accountNames = accounts.results.flatMap((account) => [
      account.marketingName,
      account.name,
    ]);
  } catch {
    // Accounts may still be syncing right after the authorization.
  }

  const identities = [...accountNames, item.connector?.name];
  const logoPath = getBankLogoPath(...identities);
  const hasAccounts = accountNames.some(Boolean);

  return {
    connectorName:
      logoPath || hasAccounts
        ? getBankDisplayName(...identities)
        : (item.connector?.name ?? null),
    connectorImageUrl: logoPath ?? item.connector?.imageUrl ?? null,
    status: item.status ?? null,
  };
}

/** Connections saved before details were tracked get them once, quietly. */
async function backfillConnectionDetails(
  connections: PluggyConnectionSummary[],
): Promise<PluggyConnectionSummary[]> {
  if (connections.every((connection) => connection.connectorName)) {
    return connections;
  }

  let client: PluggyClient;
  try {
    client = await getPluggyClient();
  } catch {
    return connections;
  }

  return Promise.all(
    connections.map(async (connection) => {
      if (connection.connectorName) return connection;

      try {
        const item = await client.fetchItem(connection.itemId);
        const details = await describeItem(client, item);
        await prisma.pluggyItem.upsert({
          where: { itemId: connection.itemId },
          create: { itemId: connection.itemId, ...details },
          update: details,
        });
        return { itemId: connection.itemId, ...details };
      } catch {
        return connection;
      }
    }),
  );
}

function readField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function savePluggyCredentials(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  await verifySession();

  const clientId = readField(formData, "clientId");
  const clientSecret = readField(formData, "clientSecret");

  if (!clientId || !clientSecret) {
    return {
      status: "error",
      message: "Preencha o Client ID e o Client Secret da sua aplicação.",
      fields: { clientId },
    };
  }

  try {
    // Any authenticated call proves the pair is valid before we keep it.
    await createPluggyClient({ clientId, clientSecret }).fetchCategories();
  } catch {
    return {
      status: "error",
      message:
        "A Pluggy recusou essas credenciais. Copie de novo o Client ID e o Client Secret da página da aplicação no dashboard.",
      fields: { clientId },
    };
  }

  await prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      pluggyClientId: clientId,
      pluggyClientSecret: clientSecret,
    },
    update: { pluggyClientId: clientId, pluggyClientSecret: clientSecret },
  });

  clearPluggyCache();
  revalidatePath("/", "layout");

  return { status: "success", message: "Credenciais validadas e salvas." };
}

export async function addPluggyConnection(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  await verifySession();

  const rawItemId = readField(formData, "itemId");

  if (!isValidPluggyItemId(rawItemId)) {
    return {
      status: "error",
      message:
        "Isso não parece um Item ID. Ele tem o formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.",
      fields: { itemId: rawItemId },
    };
  }

  const itemId = normalizePluggyItemId(rawItemId);

  let client: PluggyClient;
  let item: Item;
  try {
    client = await getPluggyClient({ fresh: true });
    item = await client.fetchItem(itemId);
  } catch {
    return {
      status: "error",
      message:
        "A Pluggy não encontrou esse Item ID. Confira se você autorizou o MeuPluggy na Demo da mesma aplicação cujas credenciais salvou aqui.",
      fields: { itemId: rawItemId },
    };
  }

  const details = await describeItem(client, item);

  await prisma.pluggyItem.upsert({
    where: { itemId },
    create: { itemId, ...details },
    update: details,
  });

  clearPluggyCache();
  revalidatePath("/", "layout");

  return {
    status: "success",
    message: `${details.connectorName ?? "Conexão"} conectado. Importando seus dados…`,
  };
}

export async function removePluggyConnection(formData: FormData) {
  await verifySession();

  const itemId = readField(formData, "itemId");

  if (itemId) {
    await prisma.pluggyItem.deleteMany({ where: { itemId } });
    clearPluggyCache();
    revalidatePath("/", "layout");
  }
}

export async function completeOnboarding(): Promise<never> {
  await verifySession();

  const now = new Date();

  await prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, onboardingCompletedAt: now },
    update: { onboardingCompletedAt: now },
  });

  revalidatePath("/", "layout");
  redirect("/");
}
