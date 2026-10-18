// Runs Worthly with fictional data, without Pluggy credentials.
//
//   npm run demo          seeds prisma/demo.db and starts the dev server
//   npm run demo:seed     only (re)creates prisma/demo.db
//
// Sign in with the demo account below. Your real prisma/dev.db is untouched.
import { execSync, spawn } from "node:child_process";
import { randomBytes, randomUUID, scrypt } from "node:crypto";
import { promisify } from "node:util";

import Database from "better-sqlite3";

const DEMO_EMAIL = "demo@worthly.test";
const DEMO_PASSWORD = "worthly-demo";
const DEMO_DATABASE_URL = "file:./prisma/demo.db";
const DEMO_PORT = "3100";
const DAY_MS = 86_400_000;

const env = {
  ...process.env,
  DATABASE_URL: DEMO_DATABASE_URL,
  WORTHLY_DEMO: "1",
};

const scryptAsync = promisify(scrypt);

/** Same format as src/lib/auth/password.ts. */
async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize("NFKC"), salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });

  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

function id() {
  return randomUUID().replaceAll("-", "");
}

function dateKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

/** Smooth growth with a little noise, ending near `end`. */
function series(days, start, end, wobble, seed) {
  let state = seed;
  const random = () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };

  return Array.from({ length: days }, (_, index) => {
    const progress = index / (days - 1);
    const eased = progress * progress * (3 - 2 * progress);
    const noise = (random() - 0.5) * wobble * Math.sin(progress * Math.PI);
    return Math.round((start + (end - start) * eased + noise) * 100) / 100;
  });
}

async function seed() {
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });

  const db = new Database("prisma/demo.db");
  const now = new Date();
  const iso = (date) => date.toISOString();

  db.exec(`
    DELETE FROM "Session";
    DELETE FROM "Passkey";
    DELETE FROM "User";
    DELETE FROM "AppSettings";
    DELETE FROM "PluggyItem";
    DELETE FROM "PortfolioSnapshotCategory";
    DELETE FROM "PortfolioSnapshot";
    DELETE FROM "NetWorthSnapshot";
  `);

  db.prepare(
    `INSERT INTO "User" (id, firstName, lastName, email, passwordHash, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id(),
    "Marina",
    "Costa",
    DEMO_EMAIL,
    await hashPassword(DEMO_PASSWORD),
    iso(now),
    iso(now),
  );

  db.prepare(
    `INSERT INTO "AppSettings" (id, pluggyClientId, pluggyClientSecret, onboardingCompletedAt, createdAt, updatedAt)
     VALUES ('default', 'demo', 'demo', ?, ?, ?)`,
  ).run(iso(now), iso(now), iso(now));

  const items = [
    ["demo-item-nubank", "Nubank", "/assets/banks/nubank.svg"],
    ["demo-item-inter", "Banco Inter", "/assets/banks/inter.svg"],
    ["demo-item-santander", "Santander", "/assets/banks/santander.svg"],
  ];
  const insertItem = db.prepare(
    `INSERT INTO "PluggyItem" (id, itemId, connectorName, connectorImageUrl, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'UPDATED', ?, ?)`,
  );
  items.forEach(([itemId, name, logo], index) => {
    const createdAt = iso(new Date(now.getTime() - (200 - index) * DAY_MS));
    insertItem.run(id(), itemId, name, logo, createdAt, createdAt);
  });

  // History up to yesterday; the app writes today's snapshot on first visit.
  const days = 90;
  const dates = Array.from(
    { length: days },
    (_, index) => new Date(now.getTime() - (days - index) * DAY_MS),
  );
  const netWorth = series(days, 226_400, 256_900, 4_800, 7);
  const insertNetWorth = db.prepare(
    `INSERT INTO "NetWorthSnapshot" (id, snapshotDate, capturedAt, currencyCode, accountBalance, investmentBalance, creditUsed, netWorth)
     VALUES (?, ?, ?, 'BRL', ?, ?, ?, ?)`,
  );

  const categories = {
    FIXED_INCOME: series(days, 118_200, 130_900, 600, 11),
    EQUITY: series(days, 61_400, 69_100, 4_200, 13),
    ETF: series(days, 23_100, 27_700, 1_900, 17),
    MUTUAL_FUND: series(days, 10_350, 11_150, 260, 19),
    SECURITY: series(days, 6_900, 7_900, 90, 23),
  };
  const insertPortfolio = db.prepare(
    `INSERT INTO "PortfolioSnapshot" (id, snapshotDate, capturedAt, currencyCode, balance, amountOriginal, amountProfit)
     VALUES (?, ?, ?, 'BRL', ?, ?, ?)`,
  );
  const insertCategory = db.prepare(
    `INSERT INTO "PortfolioSnapshotCategory" (id, snapshotId, categoryKey, balance, amountOriginal, amountProfit, assetCount)
     VALUES (?, ?, ?, ?, NULL, NULL, ?)`,
  );
  const assetCounts = {
    FIXED_INCOME: 5,
    EQUITY: 5,
    ETF: 2,
    MUTUAL_FUND: 1,
    SECURITY: 1,
  };

  db.transaction(() => {
    dates.forEach((date, index) => {
      const snapshotDate = dateKey(date);
      const investmentBalance = Object.values(categories).reduce(
        (total, values) => total + values[index],
        0,
      );
      const original = 196_400 + index * 160;

      insertNetWorth.run(
        id(),
        snapshotDate,
        iso(date),
        Math.max(0, netWorth[index] - investmentBalance + 9_000),
        investmentBalance,
        9_000,
        netWorth[index],
      );

      const snapshotId = id();
      insertPortfolio.run(
        snapshotId,
        snapshotDate,
        iso(date),
        investmentBalance,
        original,
        investmentBalance - original,
      );
      for (const [key, values] of Object.entries(categories)) {
        insertCategory.run(
          id(),
          snapshotId,
          key,
          values[index],
          assetCounts[key],
        );
      }
    });
  })();

  db.close();
  console.log(
    `\nBanco demo pronto. Entre com ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`,
  );
}

await seed();

if (process.argv[2] !== "seed") {
  const child = spawn(`npx next dev --port ${DEMO_PORT}`, {
    stdio: "inherit",
    env,
    shell: true,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}
