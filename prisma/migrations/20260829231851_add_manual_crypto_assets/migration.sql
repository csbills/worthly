-- CreateTable
CREATE TABLE "ManualCryptoAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "averagePrice" REAL,
    "currentPrice" REAL NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'BRL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ManualCryptoAsset_currencyCode_idx" ON "ManualCryptoAsset"("currencyCode");

-- CreateIndex
CREATE UNIQUE INDEX "ManualCryptoAsset_symbol_currencyCode_key" ON "ManualCryptoAsset"("symbol", "currencyCode");
