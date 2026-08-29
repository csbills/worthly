import "server-only";
import { PluggyClient } from "pluggy-sdk";

type PluggyCredential = "PLUGGY_CLIENT_ID" | "PLUGGY_CLIENT_SECRET";

function getRequiredCredential(name: PluggyCredential): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getPluggyClient(): PluggyClient {
  return new PluggyClient({
    clientId: getRequiredCredential("PLUGGY_CLIENT_ID"),
    clientSecret: getRequiredCredential("PLUGGY_CLIENT_SECRET"),
  });
}
