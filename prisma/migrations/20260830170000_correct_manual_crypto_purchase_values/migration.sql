-- Recalculate cached derived values when the purchase total already includes the fee.
UPDATE "ManualCryptoAsset"
SET
    "quantity" = ("purchaseTotal" - "brokerFee") / "purchasePrice",
    "averagePrice" = "purchaseTotal" / (("purchaseTotal" - "brokerFee") / "purchasePrice")
WHERE "purchaseTotal" IS NOT NULL
  AND "purchasePrice" IS NOT NULL
  AND "purchasePrice" > 0
  AND "purchaseTotal" > "brokerFee";
