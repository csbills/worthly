-- CreateTable
CREATE TABLE "AssistantAgent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🤖',
    "instructions" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AssistantConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "agentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssistantConversation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AssistantAgent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AssistantConversation" ("createdAt", "id", "title", "updatedAt") SELECT "createdAt", "id", "title", "updatedAt" FROM "AssistantConversation";
DROP TABLE "AssistantConversation";
ALTER TABLE "new_AssistantConversation" RENAME TO "AssistantConversation";
CREATE INDEX "AssistantConversation_updatedAt_idx" ON "AssistantConversation"("updatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
