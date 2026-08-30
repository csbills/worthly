-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ManualCryptoAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "averagePrice" REAL,
    "currentPrice" REAL,
    "purchaseTotal" REAL,
    "brokerFee" REAL NOT NULL DEFAULT 0,
    "purchasePrice" REAL,
    "currencyCode" TEXT NOT NULL DEFAULT 'BRL',
    "coingeckoId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ManualCryptoAsset" ("averagePrice", "coingeckoId", "createdAt", "currencyCode", "currentPrice", "id", "name", "quantity", "symbol", "updatedAt") SELECT "averagePrice", "coingeckoId", "createdAt", "currencyCode", "currentPrice", "id", "name", "quantity", "symbol", "updatedAt" FROM "ManualCryptoAsset";
DROP TABLE "ManualCryptoAsset";
ALTER TABLE "new_ManualCryptoAsset" RENAME TO "ManualCryptoAsset";
CREATE INDEX "ManualCryptoAsset_coingeckoId_idx" ON "ManualCryptoAsset"("coingeckoId");
CREATE INDEX "ManualCryptoAsset_currencyCode_idx" ON "ManualCryptoAsset"("currencyCode");
CREATE UNIQUE INDEX "ManualCryptoAsset_symbol_currencyCode_key" ON "ManualCryptoAsset"("symbol", "currencyCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
