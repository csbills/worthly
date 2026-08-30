import { describe, expect, it } from "vitest";

import {
  findSupportedCryptoAsset,
  supportedCryptoAssets,
} from "./crypto-assets";

describe("Supported crypto assets", () => {
  it("keeps the catalog metadata needed by CoinGecko", () => {
    expect(findSupportedCryptoAsset("bitcoin")).toEqual({
      symbol: "BTC",
      name: "Bitcoin",
      coingeckoId: "bitcoin",
    });
  });

  it("returns no asset for an ID outside the hardcoded catalog", () => {
    expect(findSupportedCryptoAsset("unknown-coin")).toBeUndefined();
  });

  it("exposes a non-empty catalog for the registration form", () => {
    expect(supportedCryptoAssets.length).toBeGreaterThan(0);
  });
});
