-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PluggyItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "connectorName" TEXT,
    "connectorImageUrl" TEXT,
    "status" TEXT,
    "memberId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PluggyItem_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PluggyItem" ("connectorImageUrl", "connectorName", "createdAt", "id", "itemId", "status", "updatedAt") SELECT "connectorImageUrl", "connectorName", "createdAt", "id", "itemId", "status", "updatedAt" FROM "PluggyItem";
DROP TABLE "PluggyItem";
ALTER TABLE "new_PluggyItem" RENAME TO "PluggyItem";
CREATE UNIQUE INDEX "PluggyItem_itemId_key" ON "PluggyItem"("itemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
