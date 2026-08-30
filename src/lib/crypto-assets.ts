export const supportedCryptoAssets = [
  { symbol: "BTC", name: "Bitcoin", coingeckoId: "bitcoin" },
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum" },
  { symbol: "SOL", name: "Solana", coingeckoId: "solana" },
  { symbol: "USDT", name: "Tether", coingeckoId: "tether" },
  { symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin" },
  { symbol: "XRP", name: "XRP", coingeckoId: "ripple" },
  { symbol: "ADA", name: "Cardano", coingeckoId: "cardano" },
  { symbol: "BNB", name: "BNB", coingeckoId: "binancecoin" },
  { symbol: "DOGE", name: "Dogecoin", coingeckoId: "dogecoin" },
  { symbol: "AVAX", name: "Avalanche", coingeckoId: "avalanche-2" },
  { symbol: "LINK", name: "Chainlink", coingeckoId: "chainlink" },
] as const;

export type SupportedCryptoAsset = (typeof supportedCryptoAssets)[number];

const cryptoLogoPaths: Partial<Record<string, string>> = {
  bitcoin: "/assets/crypto/bitcoin.svg",
  ethereum: "/assets/crypto/ethereum.svg",
  solana: "/assets/crypto/solana.svg",
};

export function findSupportedCryptoAsset(value: string) {
  const normalizedValue = value.trim().toLocaleLowerCase("en-US");

  return supportedCryptoAssets.find(
    (asset) =>
      asset.coingeckoId === normalizedValue ||
      asset.symbol.toLocaleLowerCase("en-US") === normalizedValue,
  );
}

export function getCryptoAssetLogo(coingeckoId: string | null) {
  if (!coingeckoId) {
    return null;
  }

  return cryptoLogoPaths[coingeckoId.trim().toLocaleLowerCase("en-US")] ?? null;
}
