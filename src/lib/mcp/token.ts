import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const PREFIX = "wmcp_";

/** Token novo para o servidor MCP. Mostrado uma vez; só o hash fica salvo. */
export function generateMcpToken() {
  return `${PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashMcpToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Lê "Authorization: Bearer <token>" e compara em tempo constante. */
export function verifyMcpAuthorization(
  authorization: string | null,
  storedHash: string | null | undefined,
) {
  if (!authorization || !storedHash) return false;

  const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
  const token = match?.[1];
  if (!token?.startsWith(PREFIX)) return false;

  const given = Buffer.from(hashMcpToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");

  return given.length === expected.length && timingSafeEqual(given, expected);
}
