import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the password it hashed", async () => {
    const hash = await hashPassword("correct horse battery");

    await expect(verifyPassword("correct horse battery", hash)).resolves.toBe(
      true,
    );
  });

  it("rejects a different password", async () => {
    const hash = await hashPassword("correct horse battery");

    await expect(verifyPassword("wrong horse battery", hash)).resolves.toBe(
      false,
    );
  });

  it("never stores the password itself and salts every hash", async () => {
    const first = await hashPassword("same-password-123");
    const second = await hashPassword("same-password-123");

    expect(first).not.toContain("same-password-123");
    expect(first).not.toBe(second);
    expect(first.startsWith("scrypt$")).toBe(true);
  });

  it("treats malformed hashes as a failed match", async () => {
    await expect(verifyPassword("anything", "not-a-hash")).resolves.toBe(false);
    await expect(verifyPassword("anything", "scrypt$x$y")).resolves.toBe(false);
  });
});
