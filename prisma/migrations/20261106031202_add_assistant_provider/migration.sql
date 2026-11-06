-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "pluggyClientId" TEXT,
    "pluggyClientSecret" TEXT,
    "anthropicApiKey" TEXT,
    "assistantProvider" TEXT NOT NULL DEFAULT 'anthropic',
    "assistantApiKey" TEXT,
    "assistantBaseUrl" TEXT,
    "assistantModel" TEXT,
    "mcpTokenHash" TEXT,
    "mcpTokenCreatedAt" DATETIME,
    "onboardingCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSettings" ("anthropicApiKey", "createdAt", "id", "mcpTokenCreatedAt", "mcpTokenHash", "onboardingCompletedAt", "pluggyClientId", "pluggyClientSecret", "updatedAt") SELECT "anthropicApiKey", "createdAt", "id", "mcpTokenCreatedAt", "mcpTokenHash", "onboardingCompletedAt", "pluggyClientId", "pluggyClientSecret", "updatedAt" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
