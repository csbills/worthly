-- CreateTable
CREATE TABLE "ManualCryptoOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "orderDate" DATETIME NOT NULL,
    "total" REAL NOT NULL,
    "brokerFee" REAL NOT NULL DEFAULT 0,
    "unitPrice" REAL NOT NULL,
    "quantity" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManualCryptoOrder_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ManualCryptoAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Convert each legacy single-position record into its first BUY order.
INSERT INTO "ManualCryptoOrder" (
    "id",
    "assetId",
    "side",
    "orderDate",
    "total",
    "brokerFee",
    "unitPrice",
    "quantity",
    "createdAt",
    "updatedAt"
)
SELECT
    lower(hex(randomblob(16))),
    "id",
    'BUY',
    "createdAt",
    CASE
        WHEN "purchaseTotal" IS NOT NULL
            AND "purchasePrice" IS NOT NULL
            AND "purchaseTotal" > COALESCE("brokerFee", 0)
            AND "purchasePrice" > 0
        THEN "purchaseTotal"
        ELSE "quantity" * "averagePrice"
    END,
    CASE
        WHEN "purchaseTotal" IS NOT NULL
            AND "purchasePrice" IS NOT NULL
            AND "purchaseTotal" > COALESCE("brokerFee", 0)
            AND "purchasePrice" > 0
        THEN COALESCE("brokerFee", 0)
        ELSE 0
    END,
    CASE
        WHEN "purchaseTotal" IS NOT NULL
            AND "purchasePrice" IS NOT NULL
            AND "purchaseTotal" > COALESCE("brokerFee", 0)
            AND "purchasePrice" > 0
        THEN "purchasePrice"
        ELSE "averagePrice"
    END,
    CASE
        WHEN "purchaseTotal" IS NOT NULL
            AND "purchasePrice" IS NOT NULL
            AND "purchaseTotal" > COALESCE("brokerFee", 0)
            AND "purchasePrice" > 0
        THEN ("purchaseTotal" - COALESCE("brokerFee", 0)) / "purchasePrice"
        ELSE "quantity"
    END,
    "createdAt",
    "updatedAt"
FROM "ManualCryptoAsset"
WHERE (
    "purchaseTotal" IS NOT NULL
    AND "purchasePrice" IS NOT NULL
    AND "purchaseTotal" > COALESCE("brokerFee", 0)
    AND "purchasePrice" > 0
)
OR (
    "quantity" > 0
    AND "averagePrice" IS NOT NULL
    AND "averagePrice" > 0
);

-- CreateIndex
CREATE INDEX "ManualCryptoOrder_assetId_orderDate_idx" ON "ManualCryptoOrder"("assetId", "orderDate");

-- CreateIndex
CREATE INDEX "ManualCryptoOrder_orderDate_idx" ON "ManualCryptoOrder"("orderDate");
