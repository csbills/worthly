const bankLogoPaths = {
  inter: "/assets/banks/inter.svg",
  nubank: "/assets/banks/nubank.svg",
  santander: "/assets/banks/santander.svg",
} as const;

function normalizeIdentity(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleUpperCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

export function getBankLogoPath(
  ...identities: Array<string | null | undefined>
) {
  const normalizedIdentity = identities
    .filter((identity): identity is string => Boolean(identity?.trim()))
    .map(normalizeIdentity)
    .join(" ");

  if (
    normalizedIdentity.includes("NU FINANCEIRA") ||
    normalizedIdentity.includes("NU PAGAMENTOS") ||
    /\bNUBANK\b/u.test(normalizedIdentity)
  ) {
    return bankLogoPaths.nubank;
  }

  if (normalizedIdentity.includes("SANTANDER")) {
    return bankLogoPaths.santander;
  }

  if (
    normalizedIdentity.includes("BANCO INTER") ||
    /\bINTER\b/u.test(normalizedIdentity)
  ) {
    return bankLogoPaths.inter;
  }

  return null;
}
