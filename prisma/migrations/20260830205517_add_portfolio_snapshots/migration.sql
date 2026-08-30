-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotDate" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currencyCode" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "amountOriginal" REAL,
    "amountProfit" REAL
);

-- CreateTable
CREATE TABLE "PortfolioSnapshotCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "amountOriginal" REAL,
    "amountProfit" REAL,
    "assetCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PortfolioSnapshotCategory_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PortfolioSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_currencyCode_snapshotDate_idx" ON "PortfolioSnapshot"("currencyCode", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioSnapshot_snapshotDate_currencyCode_key" ON "PortfolioSnapshot"("snapshotDate", "currencyCode");

-- CreateIndex
CREATE INDEX "PortfolioSnapshotCategory_snapshotId_idx" ON "PortfolioSnapshotCategory"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioSnapshotCategory_snapshotId_categoryKey_key" ON "PortfolioSnapshotCategory"("snapshotId", "categoryKey");
