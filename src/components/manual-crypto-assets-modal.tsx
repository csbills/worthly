"use client";

import { ManualCryptoOrderModal } from "@/components/manual-crypto-order-modal";
import type { SupportedCryptoAsset } from "@/lib/crypto-assets";

/**
 * Compatibility wrapper for callers that still use the previous component name.
 */
export function ManualCryptoAssetsModal({
  assets,
}: {
  assets: readonly SupportedCryptoAsset[];
}) {
  return <ManualCryptoOrderModal catalog={assets} />;
}
