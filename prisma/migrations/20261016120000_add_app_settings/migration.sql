-- AlterTable
ALTER TABLE "PluggyItem" ADD COLUMN "connectorImageUrl" TEXT;
ALTER TABLE "PluggyItem" ADD COLUMN "connectorName" TEXT;
ALTER TABLE "PluggyItem" ADD COLUMN "status" TEXT;

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "pluggyClientId" TEXT,
    "pluggyClientSecret" TEXT,
    "onboardingCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
