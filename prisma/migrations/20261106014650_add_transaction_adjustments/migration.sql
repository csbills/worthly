-- CreateTable
CREATE TABLE "TransactionOverride" (
    "transactionId" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT,
    "note" TEXT,
    "ignored" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CategoryRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pattern" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "CategoryRule_createdAt_idx" ON "CategoryRule"("createdAt");
