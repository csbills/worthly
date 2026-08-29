import { PluggyClient } from "pluggy-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getPluggyClient } from "./pluggy";

vi.mock("server-only", () => ({}));

const originalClientId = process.env.PLUGGY_CLIENT_ID;
const originalClientSecret = process.env.PLUGGY_CLIENT_SECRET;

afterEach(() => {
  if (originalClientId === undefined) {
    delete process.env.PLUGGY_CLIENT_ID;
  } else {
    process.env.PLUGGY_CLIENT_ID = originalClientId;
  }

  if (originalClientSecret === undefined) {
    delete process.env.PLUGGY_CLIENT_SECRET;
  } else {
    process.env.PLUGGY_CLIENT_SECRET = originalClientSecret;
  }
});

describe("getPluggyClient", () => {
  it("reports which credential is missing before creating the client", () => {
    process.env.PLUGGY_CLIENT_ID = "client-id-for-tests";
    delete process.env.PLUGGY_CLIENT_SECRET;

    expect(() => getPluggyClient()).toThrow(
      "Missing required environment variable: PLUGGY_CLIENT_SECRET",
    );
  });

  it("creates a Pluggy client from the server credentials", () => {
    process.env.PLUGGY_CLIENT_ID = "client-id-for-tests";
    process.env.PLUGGY_CLIENT_SECRET = "client-secret-for-tests";

    expect(getPluggyClient()).toBeInstanceOf(PluggyClient);
  });
});
