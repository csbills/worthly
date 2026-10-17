import "server-only";
import { PluggyClient } from "pluggy-sdk";

import { prisma } from "@/lib/prisma";

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

export async function getPluggyClient(): Promise<PluggyClient> {
  const credentials = await getPluggyCredentials();

  if (!credentials) {
    throw new Error(
      "Pluggy credentials are not configured. Finish the onboarding at /onboarding.",
    );
  }

  return createPluggyClient(credentials);
}
