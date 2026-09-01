-- CreateTable
CREATE TABLE "NetWorthSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotDate" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currencyCode" TEXT NOT NULL DEFAULT 'BRL',
    "accountBalance" REAL NOT NULL,
    "investmentBalance" REAL NOT NULL,
    "creditUsed" REAL NOT NULL,
    "netWorth" REAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "NetWorthSnapshot_snapshotDate_key" ON "NetWorthSnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "NetWorthSnapshot_snapshotDate_idx" ON "NetWorthSnapshot"("snapshotDate");
