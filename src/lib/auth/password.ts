import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
// N=2^15 keeps a hash around 50–100ms on a small server: slow for an
// attacker, unnoticeable for one person logging in.
const COST = 32768;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const MAX_MEMORY = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      KEY_LENGTH,
      { N: COST, r: BLOCK_SIZE, p: PARALLELISM, maxmem: MAX_MEMORY },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

/** Format: `scrypt$<salt base64url>$<key base64url>`. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);

  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltValue, keyValue] = stored.split("$");

  if (scheme !== "scrypt" || !saltValue || !keyValue) {
    return false;
  }

  const expected = Buffer.from(keyValue, "base64url");
  if (expected.length !== KEY_LENGTH) {
    return false;
  }

  const actual = await derive(password, Buffer.from(saltValue, "base64url"));
  return timingSafeEqual(actual, expected);
}
