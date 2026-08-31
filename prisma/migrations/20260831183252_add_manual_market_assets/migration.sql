-- CreateTable
CREATE TABLE "ManualMarketAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "averagePrice" REAL,
    "currentPrice" REAL,
    "currencyCode" TEXT NOT NULL DEFAULT 'BRL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ManualMarketOrder" (
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
    CONSTRAINT "ManualMarketOrder_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ManualMarketAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ManualMarketAsset_assetType_idx" ON "ManualMarketAsset"("assetType");

-- CreateIndex
CREATE INDEX "ManualMarketAsset_currencyCode_idx" ON "ManualMarketAsset"("currencyCode");

-- CreateIndex
CREATE UNIQUE INDEX "ManualMarketAsset_symbol_currencyCode_key" ON "ManualMarketAsset"("symbol", "currencyCode");

-- CreateIndex
CREATE INDEX "ManualMarketOrder_assetId_orderDate_idx" ON "ManualMarketOrder"("assetId", "orderDate");

-- CreateIndex
CREATE INDEX "ManualMarketOrder_orderDate_idx" ON "ManualMarketOrder"("orderDate");
