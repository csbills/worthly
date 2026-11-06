-- CreateTable
CREATE TABLE "FinancialProfile" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "householdType" TEXT NOT NULL DEFAULT 'couple',
    "dependents" INTEGER NOT NULL DEFAULT 0,
    "incomeStability" TEXT NOT NULL DEFAULT 'stable',
    "incomeEarners" INTEGER NOT NULL DEFAULT 1,
    "birthYear" INTEGER,
    "mainGoal" TEXT NOT NULL DEFAULT 'independence',
    "targetIndependenceAge" INTEGER,
    "desiredMonthlyCost" REAL,
    "expectedRealReturn" REAL NOT NULL DEFAULT 4,
    "withdrawalRate" REAL NOT NULL DEFAULT 4,
    "emergencyMonths" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
