import "server-only";
import { PluggyClient } from "pluggy-sdk";

import { prisma } from "@/lib/prisma";

export type PluggyCredentials = {
  clientId: string;
  clientSecret: string;
  /** Saved through the onboarding, or read from PLUGGY_CLIENT_* env vars. */
  source: "database" | "environment";
};

/**
 * Credentials saved by the onboarding win over the environment, so someone
 * who deployed with one-click can configure everything from the browser.
 */
export async function getPluggyCredentials(): Promise<PluggyCredentials | null> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "default" },
    select: { pluggyClientId: true, pluggyClientSecret: true },
  });

  if (settings?.pluggyClientId && settings.pluggyClientSecret) {
    return {
      clientId: settings.pluggyClientId,
      clientSecret: settings.pluggyClientSecret,
      source: "database",
    };
  }

  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (clientId && clientSecret) {
    return { clientId, clientSecret, source: "environment" };
  }

  return null;
}

export function createPluggyClient({
  clientId,
  clientSecret,
}: Pick<PluggyCredentials, "clientId" | "clientSecret">): PluggyClient {
  return new PluggyClient({ clientId, clientSecret });
}

export async function getPluggyClient(): Promise<PluggyClient> {
  const credentials = await getPluggyCredentials();

  if (!credentials) {
    throw new Error(
      "Pluggy credentials are not configured. Finish the onboarding at /onboarding or set PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET.",
    );
  }

  return createPluggyClient(credentials);
}
