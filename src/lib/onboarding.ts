export const onboardingSteps = [
  { id: "welcome", label: "Boas-vindas" },
  { id: "meu-pluggy", label: "Conectar bancos" },
  { id: "credentials", label: "Credenciais da API" },
  { id: "connect", label: "Autorizar e importar" },
  { id: "done", label: "Pronto" },
] as const;

export type OnboardingStepId = (typeof onboardingSteps)[number]["id"];

const itemIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** Item IDs are the UUIDs the Pluggy Demo copies with “Copiar Item ID”. */
export function isValidPluggyItemId(value: string) {
  return itemIdPattern.test(value.trim());
}

export function normalizePluggyItemId(value: string) {
  return value.trim().toLowerCase();
}

/** Shows just enough of a credential to recognise it, never the whole thing. */
export function maskIdentifier(value: string) {
  if (value.length < 12) {
    return "••••";
  }

  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function getInitialOnboardingStep({
  hasCredentials,
  connectionCount,
}: {
  hasCredentials: boolean;
  connectionCount: number;
}): OnboardingStepId {
  if (!hasCredentials) {
    return "welcome";
  }

  return connectionCount > 0 ? "done" : "connect";
}
