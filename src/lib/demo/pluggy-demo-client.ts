import type {
  Account,
  CreditCardBills,
  Investment,
  InvestmentTransaction,
  Item,
  PageResponse,
  PluggyClient,
  Transaction,
} from "pluggy-sdk";

/**
 * Demo mode: a fake Pluggy with a fictional person's banks, cards and
 * investments, used for screenshots and for trying the app without Pluggy
 * credentials. Enable it with WORTHLY_DEMO=1 and seed the database with
 * `npm run demo:seed`.
 */
export function isDemoMode(
  env: Record<string, string | undefined> = process.env,
) {
  return env.WORTHLY_DEMO === "1" || env.WORTHLY_DEMO === "true";
}

export const DEMO_ITEM_IDS = [
  "demo-item-nubank",
  "demo-item-inter",
  "demo-item-santander",
] as const;

type DemoItemId = (typeof DEMO_ITEM_IDS)[number];

const connectorNames: Record<DemoItemId, string> = {
  "demo-item-nubank": "Nubank",
  "demo-item-inter": "Banco Inter",
  "demo-item-santander": "Santander",
};

type DemoCategory = { id: string; name: string };

const category = {
  salary: { id: "01010000", name: "Salary" },
  freelance: { id: "01030000", name: "Entrepreneurial activities" },
  fixedIncome: { id: "03020000", name: "Fixed income" },
  pixReceived: { id: "05070000", name: "Transfer - PIX" },
  pixSent: { id: "05090004", name: "Third party transfer - PIX" },
  cardPayment: { id: "05100000", name: "Credit card payment" },
  internet: { id: "07010001", name: "Internet" },
  mobile: { id: "07010002", name: "Mobile" },
  onlineCourses: { id: "07020001", name: "Online Courses" },
  gym: { id: "07030001", name: "Gyms and fitness centers" },
  cinema: { id: "07040003", name: "Cinema, theater and concerts" },
  onlineShopping: { id: "08010000", name: "Online shopping" },
  electronics: { id: "08020000", name: "Electronics" },
  pet: { id: "08030000", name: "Pet supplies and vet" },
  clothing: { id: "08040000", name: "Clothing" },
  books: { id: "08060000", name: "Bookstore" },
  sportsGoods: { id: "08070000", name: "Sports goods" },
  videoStreaming: { id: "09020000", name: "Video streaming" },
  musicStreaming: { id: "09030000", name: "Music streaming" },
  groceries: { id: "10000000", name: "Groceries" },
  eatingOut: { id: "11010000", name: "Eating out" },
  delivery: { id: "11020000", name: "Food delivery" },
  airlines: { id: "12010000", name: "Airport and airlines" },
  accommodation: { id: "12020000", name: "Accomodation" },
  rent: { id: "17010000", name: "Rent" },
  water: { id: "17020001", name: "Water" },
  electricity: { id: "17020002", name: "Electricity" },
  houseware: { id: "17030000", name: "Houseware" },
  pharmacy: { id: "18020000", name: "Pharmacy" },
  rideHailing: { id: "19010000", name: "Taxi and ride-hailing" },
  gasStation: { id: "19050001", name: "Gas stations" },
  parking: { id: "19050002", name: "Parking" },
} satisfies Record<string, DemoCategory>;

type DemoAccountSpec = {
  id: string;
  itemId: DemoItemId;
  kind: "checking" | "card";
  name: string;
  marketingName: string;
  number: string;
  balance?: number;
  card?: {
    level: string;
    brand: string;
    limit: number;
    closingDay: number;
    dueDay: number;
  };
};

const accountSpecs: DemoAccountSpec[] = [
  {
    id: "demo-nubank-checking",
    itemId: "demo-item-nubank",
    kind: "checking",
    name: "NU PAGAMENTOS S.A.",
    marketingName: "Conta Nubank",
    number: "0001/98765432-1",
    balance: 12_847.35,
  },
  {
    id: "demo-nubank-card",
    itemId: "demo-item-nubank",
    kind: "card",
    name: "Nubank Ultravioleta",
    marketingName: "Nubank Ultravioleta",
    number: "5162 •••• •••• 4821",
    card: {
      level: "ULTRAVIOLETA",
      brand: "MASTERCARD",
      limit: 22_000,
      closingDay: 1,
      dueDay: 8,
    },
  },
  {
    id: "demo-inter-checking",
    itemId: "demo-item-inter",
    kind: "checking",
    name: "BANCO INTER S.A.",
    marketingName: "Conta Digital Inter",
    number: "0001/12345678-9",
    balance: 4_215.8,
  },
  {
    id: "demo-inter-card",
    itemId: "demo-item-inter",
    kind: "card",
    name: "Inter Black",
    marketingName: "Inter Mastercard Black",
    number: "5379 •••• •••• 1043",
    card: {
      level: "BLACK",
      brand: "MASTERCARD",
      limit: 15_000,
      closingDay: 26,
      dueDay: 5,
    },
  },
  {
    id: "demo-santander-card",
    itemId: "demo-item-santander",
    kind: "card",
    name: "Santander Unique",
    marketingName: "Santander Unique Visa Infinite",
    number: "4220 •••• •••• 7756",
    card: {
      level: "INFINITE",
      brand: "VISA",
      limit: 9_500,
      closingDay: 18,
      dueDay: 28,
    },
  },
];

type DemoTransaction = {
  accountId: string;
  date: Date;
  description: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  category: DemoCategory;
  installment?: {
    number: number;
    total: number;
    totalAmount: number;
    purchaseDate: Date;
  };
};

/** mulberry32: small, fast and good enough to vary amounts. */
function createRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

/** Noon in São Paulo, so every transaction lands on the intended local day. */
function localNoon(year: number, monthIndex: number, day: number) {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, monthIndex, Math.min(day, lastDay), 15));
}

function startOfLocalDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

const historyMonths = 7;

const merchantPool: Array<{
  accountId: string;
  description: string;
  category: DemoCategory;
  min: number;
  max: number;
  weight: number;
}> = [
  {
    accountId: "demo-nubank-card",
    description: "iFood",
    category: category.delivery,
    min: 38,
    max: 112,
    weight: 9,
  },
  {
    accountId: "demo-nubank-card",
    description: "Uber *Trip",
    category: category.rideHailing,
    min: 14,
    max: 46,
    weight: 9,
  },
  {
    accountId: "demo-nubank-card",
    description: "Pão de Açúcar",
    category: category.groceries,
    min: 85,
    max: 380,
    weight: 6,
  },
  {
    accountId: "demo-nubank-card",
    description: "Coco Bambu",
    category: category.eatingOut,
    min: 160,
    max: 320,
    weight: 2,
  },
  {
    accountId: "demo-nubank-card",
    description: "Starbucks",
    category: category.eatingOut,
    min: 18,
    max: 42,
    weight: 4,
  },
  {
    accountId: "demo-nubank-card",
    description: "Drogasil",
    category: category.pharmacy,
    min: 25,
    max: 140,
    weight: 3,
  },
  {
    accountId: "demo-nubank-card",
    description: "Amazon.com.br",
    category: category.onlineShopping,
    min: 49,
    max: 310,
    weight: 3,
  },
  {
    accountId: "demo-inter-card",
    description: "Posto Shell Select",
    category: category.gasStation,
    min: 180,
    max: 290,
    weight: 3,
  },
  {
    accountId: "demo-inter-card",
    description: "Hortifruti",
    category: category.groceries,
    min: 60,
    max: 190,
    weight: 4,
  },
  {
    accountId: "demo-inter-card",
    description: "Outback Steakhouse",
    category: category.eatingOut,
    min: 140,
    max: 260,
    weight: 2,
  },
  {
    accountId: "demo-inter-card",
    description: "Petz",
    category: category.pet,
    min: 70,
    max: 240,
    weight: 2,
  },
  {
    accountId: "demo-inter-card",
    description: "Estapar",
    category: category.parking,
    min: 18,
    max: 45,
    weight: 2,
  },
  {
    accountId: "demo-santander-card",
    description: "Zara Brasil",
    category: category.clothing,
    min: 180,
    max: 520,
    weight: 1,
  },
  {
    accountId: "demo-santander-card",
    description: "Livraria da Vila",
    category: category.books,
    min: 55,
    max: 160,
    weight: 1,
  },
  {
    accountId: "demo-santander-card",
    description: "Cinemark",
    category: category.cinema,
    min: 48,
    max: 110,
    weight: 1,
  },
  {
    accountId: "demo-santander-card",
    description: "Carrefour",
    category: category.groceries,
    min: 120,
    max: 420,
    weight: 2,
  },
];

const installmentPurchases: Array<{
  accountId: string;
  description: string;
  category: DemoCategory;
  monthsAgo: number;
  day: number;
  total: number;
  amount: number;
}> = [
  {
    accountId: "demo-nubank-card",
    description: "Apple Store - MacBook Air",
    category: category.electronics,
    monthsAgo: 4,
    day: 12,
    total: 10,
    amount: 1_099.9,
  },
  {
    accountId: "demo-nubank-card",
    description: "Magazine Luiza - Geladeira",
    category: category.houseware,
    monthsAgo: 8,
    day: 3,
    total: 12,
    amount: 349,
  },
  {
    accountId: "demo-inter-card",
    description: "LATAM - São Paulo/Lisboa",
    category: category.airlines,
    monthsAgo: 2,
    day: 20,
    total: 6,
    amount: 712.4,
  },
  {
    accountId: "demo-inter-card",
    description: "Booking.com - Hotel Lisboa",
    category: category.accommodation,
    monthsAgo: 1,
    day: 22,
    total: 4,
    amount: 486.75,
  },
  {
    accountId: "demo-santander-card",
    description: 'Fast Shop - Smart TV 55"',
    category: category.electronics,
    monthsAgo: 3,
    day: 9,
    total: 8,
    amount: 412.38,
  },
  {
    accountId: "demo-santander-card",
    description: "Centauro - Tênis de corrida",
    category: category.sportsGoods,
    monthsAgo: 5,
    day: 16,
    total: 3,
    amount: 233.3,
  },
];

function buildTransactions(now: Date): DemoTransaction[] {
  const random = createRandom(
    now.getUTCFullYear() * 10_000 +
      (now.getUTCMonth() + 1) * 100 +
      now.getUTCDate(),
  );
  const today = startOfLocalDay(now);
  const transactions: DemoTransaction[] = [];
  const add = (transaction: DemoTransaction) => {
    if (transaction.date.getTime() <= now.getTime()) {
      transactions.push(transaction);
    }
  };
  const between = (min: number, max: number) =>
    roundCurrency(min + (max - min) * random());
  const totalWeight = merchantPool.reduce(
    (total, item) => total + item.weight,
    0,
  );

  for (let offset = historyMonths - 1; offset >= 0; offset -= 1) {
    const reference = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
    );
    const year = reference.getUTCFullYear();
    const month = reference.getUTCMonth();
    const on = (day: number) => localNoon(year, month, day);

    add({
      accountId: "demo-nubank-checking",
      date: on(5),
      description: "Salário - Aurora Tecnologia Ltda",
      amount: 14_850,
      type: "CREDIT",
      category: category.salary,
    });
    add({
      accountId: "demo-nubank-checking",
      date: on(6),
      description: "Aplicação Tesouro Selic",
      amount: -2_500,
      type: "DEBIT",
      category: category.fixedIncome,
    });
    add({
      accountId: "demo-nubank-checking",
      date: on(10),
      description: "Aluguel - Lar Imóveis",
      amount: -3_400,
      type: "DEBIT",
      category: category.rent,
    });
    add({
      accountId: "demo-nubank-checking",
      date: on(12),
      description: "Enel Distribuição SP",
      amount: -between(190, 290),
      type: "DEBIT",
      category: category.electricity,
    });
    add({
      accountId: "demo-nubank-checking",
      date: on(12),
      description: "Sabesp",
      amount: -between(82, 118),
      type: "DEBIT",
      category: category.water,
    });
    add({
      accountId: "demo-nubank-checking",
      date: on(8),
      description: "Pagamento de fatura Nubank",
      amount: -between(3_200, 4_600),
      type: "DEBIT",
      category: category.cardPayment,
    });
    add({
      accountId: "demo-nubank-checking",
      date: on(28),
      description: "Pagamento de fatura Santander",
      amount: -between(1_100, 1_900),
      type: "DEBIT",
      category: category.cardPayment,
    });
    add({
      accountId: "demo-nubank-checking",
      date: on(16),
      description: "Pix enviado - Diarista Ana Souza",
      amount: -480,
      type: "DEBIT",
      category: category.pixSent,
    });

    if (offset % 2 === 0) {
      add({
        accountId: "demo-inter-checking",
        date: on(20),
        description: "Pix recebido - Studio Norte Design",
        amount: between(1_800, 3_200),
        type: "CREDIT",
        category: category.freelance,
      });
    }
    add({
      accountId: "demo-inter-checking",
      date: on(5),
      description: "Pagamento de fatura Inter",
      amount: -between(1_900, 2_800),
      type: "DEBIT",
      category: category.cardPayment,
    });
    add({
      accountId: "demo-inter-checking",
      date: on(3),
      description: "Smart Fit",
      amount: -149.9,
      type: "DEBIT",
      category: category.gym,
    });
    add({
      accountId: "demo-inter-checking",
      date: on(15),
      description: "Vivo Fibra",
      amount: -129.9,
      type: "DEBIT",
      category: category.internet,
    });
    add({
      accountId: "demo-inter-checking",
      date: on(15),
      description: "Vivo Controle",
      amount: -64.99,
      type: "DEBIT",
      category: category.mobile,
    });
    add({
      accountId: "demo-inter-checking",
      date: on(23),
      description: "Pix recebido - Rafael Lima",
      amount: between(60, 180),
      type: "CREDIT",
      category: category.pixReceived,
    });

    add({
      accountId: "demo-nubank-card",
      date: on(14),
      description: "Netflix.com",
      amount: 59.9,
      type: "DEBIT",
      category: category.videoStreaming,
    });
    add({
      accountId: "demo-nubank-card",
      date: on(9),
      description: "Spotify",
      amount: 34.9,
      type: "DEBIT",
      category: category.musicStreaming,
    });
    add({
      accountId: "demo-santander-card",
      date: on(19),
      description: "Disney+",
      amount: 43.9,
      type: "DEBIT",
      category: category.videoStreaming,
    });
    add({
      accountId: "demo-inter-card",
      date: on(2),
      description: "Alura",
      amount: 89.9,
      type: "DEBIT",
      category: category.onlineCourses,
    });

    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    for (let day = 1; day <= daysInMonth; day += 1) {
      const purchases = random() < 0.25 ? 0 : random() < 0.6 ? 1 : 2;

      for (let index = 0; index < purchases; index += 1) {
        let pick = random() * totalWeight;
        const merchant =
          merchantPool.find((item) => {
            pick -= item.weight;
            return pick <= 0;
          }) ?? merchantPool[0];

        add({
          accountId: merchant.accountId,
          date: on(day),
          description: merchant.description,
          amount: between(merchant.min, merchant.max),
          type: "DEBIT",
          category: merchant.category,
        });
      }
    }
  }

  for (const purchase of installmentPurchases) {
    const purchaseDate = localNoon(
      now.getUTCFullYear(),
      now.getUTCMonth() - purchase.monthsAgo,
      purchase.day,
    );

    for (let number = 1; number <= purchase.total; number += 1) {
      const date = localNoon(
        purchaseDate.getUTCFullYear(),
        purchaseDate.getUTCMonth() + number - 1,
        purchase.day,
      );

      if (date.getTime() > today.getTime() + 86_400_000) {
        break;
      }

      add({
        accountId: purchase.accountId,
        date,
        description: purchase.description,
        amount: purchase.amount,
        type: "DEBIT",
        category: purchase.category,
        installment: {
          number,
          total: purchase.total,
          totalAmount: roundCurrency(purchase.amount * purchase.total),
          purchaseDate,
        },
      });
    }
  }

  return transactions.sort(
    (left, right) => right.date.getTime() - left.date.getTime(),
  );
}

function toPluggyTransaction(
  transaction: DemoTransaction,
  index: number,
): Transaction {
  return {
    id: `demo-tx-${transaction.accountId}-${transaction.date.toISOString().slice(0, 10)}-${index}`,
    accountId: transaction.accountId,
    date: transaction.date,
    description: transaction.description,
    descriptionRaw: transaction.description,
    currencyCode: "BRL",
    amount: transaction.amount,
    amountInAccountCurrency: null,
    balance: null,
    type: transaction.type,
    status: "POSTED",
    category: transaction.category.name,
    categoryId: transaction.category.id,
    providerCode: null,
    providerId: null,
    operationType: null,
    paymentData: null,
    merchant: null,
    acquirerData: null,
    creditCardMetadata: transaction.installment
      ? {
          installmentNumber: transaction.installment.number,
          totalInstallments: transaction.installment.total,
          totalAmount: transaction.installment.totalAmount,
          purchaseDate: transaction.installment.purchaseDate,
        }
      : null,
    createdAt: transaction.date,
    updatedAt: transaction.date,
  } as unknown as Transaction;
}

function getCycleDates(
  card: NonNullable<DemoAccountSpec["card"]>,
  now: Date,
  cyclesAgo: number,
) {
  const closesThisMonth = now.getUTCDate() < card.closingDay;
  const nextClosing = localNoon(
    now.getUTCFullYear(),
    now.getUTCMonth() + (closesThisMonth ? 0 : 1) - cyclesAgo,
    card.closingDay,
  );
  const dueMonthOffset = card.dueDay > card.closingDay ? 0 : 1;
  const due = localNoon(
    nextClosing.getUTCFullYear(),
    nextClosing.getUTCMonth() + dueMonthOffset,
    card.dueDay,
  );
  const previousClosing = localNoon(
    nextClosing.getUTCFullYear(),
    nextClosing.getUTCMonth() - 1,
    card.closingDay,
  );

  return { previousClosing, closing: nextClosing, due };
}

function sumCardDebits(
  transactions: readonly DemoTransaction[],
  accountId: string,
  from: Date,
  to: Date,
) {
  return roundCurrency(
    transactions
      .filter(
        (transaction) =>
          transaction.accountId === accountId &&
          transaction.type === "DEBIT" &&
          transaction.date.getTime() > from.getTime() &&
          transaction.date.getTime() <= to.getTime(),
      )
      .reduce((total, transaction) => total + transaction.amount, 0),
  );
}

function buildAccounts(transactions: readonly DemoTransaction[], now: Date) {
  return accountSpecs.map((spec): Account => {
    if (spec.kind === "checking" || !spec.card) {
      return {
        id: spec.id,
        itemId: spec.itemId,
        type: "BANK",
        subtype: "CHECKING_ACCOUNT",
        number: spec.number,
        name: spec.name,
        marketingName: spec.marketingName,
        balance: spec.balance ?? 0,
        currencyCode: "BRL",
        owner: "Marina Costa",
        taxNumber: null,
        bankData: null,
        creditData: null,
      } as unknown as Account;
    }

    const cycle = getCycleDates(spec.card, now, 0);
    const openBalance = sumCardDebits(
      transactions,
      spec.id,
      cycle.previousClosing,
      cycle.closing,
    );
    const committed = Math.min(spec.card.limit, openBalance * 1.6);

    return {
      id: spec.id,
      itemId: spec.itemId,
      type: "CREDIT",
      subtype: "CREDIT_CARD",
      number: spec.number,
      name: spec.name,
      marketingName: spec.marketingName,
      balance: openBalance,
      currencyCode: "BRL",
      owner: "Marina Costa",
      taxNumber: null,
      bankData: null,
      creditData: {
        level: spec.card.level,
        brand: spec.card.brand,
        balanceCloseDate: cycle.closing,
        balanceDueDate: cycle.due,
        availableCreditLimit: roundCurrency(spec.card.limit - committed),
        balanceForeignCurrency: 0,
        minimumPayment: roundCurrency(openBalance * 0.15),
        creditLimit: spec.card.limit,
        isLimitFlexible: false,
        status: "ACTIVE",
        holderType: "MAIN",
      },
    } as unknown as Account;
  });
}

function buildBills(
  transactions: readonly DemoTransaction[],
  spec: DemoAccountSpec,
  now: Date,
): CreditCardBills[] {
  if (!spec.card) {
    return [];
  }

  const bills: CreditCardBills[] = [];

  for (let cyclesAgo = 1; cyclesAgo <= historyMonths - 1; cyclesAgo += 1) {
    const cycle = getCycleDates(spec.card, now, cyclesAgo);

    bills.push({
      id: `demo-bill-${spec.id}-${cycle.closing.toISOString().slice(0, 7)}`,
      dueDate: cycle.due,
      billClosingDate: cycle.closing,
      totalAmount: sumCardDebits(
        transactions,
        spec.id,
        cycle.previousClosing,
        cycle.closing,
      ),
      totalAmountCurrencyCode: "BRL",
      minimumPaymentAmount: null,
      allowsInstallments: true,
      financeCharges: [],
      createdAt: cycle.closing,
      updatedAt: cycle.closing,
    } as unknown as CreditCardBills);
  }

  return bills;
}

type DemoInvestmentSpec = {
  id: string;
  itemId: DemoItemId;
  name: string;
  code?: string;
  type: Investment["type"];
  subtype: Investment["subtype"];
  institution: string;
  issuer?: string;
  balance: number;
  amountOriginal: number;
  quantity?: number;
  dueInMonths?: number;
  rateType?: string;
  rate?: number;
  dividends?: number;
};

const investmentSpecs: DemoInvestmentSpec[] = [
  {
    id: "demo-inv-selic",
    itemId: "demo-item-inter",
    name: "Tesouro Selic 2029",
    type: "FIXED_INCOME",
    subtype: "TREASURY",
    institution: "Banco Inter",
    issuer: "Tesouro Nacional",
    balance: 48_362.18,
    amountOriginal: 43_500,
    dueInMonths: 38,
    rateType: "SELIC",
    rate: 100,
  },
  {
    id: "demo-inv-ipca",
    itemId: "demo-item-inter",
    name: "Tesouro IPCA+ 2035",
    type: "FIXED_INCOME",
    subtype: "TREASURY",
    institution: "Banco Inter",
    issuer: "Tesouro Nacional",
    balance: 21_904.6,
    amountOriginal: 19_200,
    dueInMonths: 104,
    rateType: "IPCA",
    rate: 6.2,
  },
  {
    id: "demo-inv-cdb-inter",
    itemId: "demo-item-inter",
    name: "CDB Inter 110% CDI",
    type: "FIXED_INCOME",
    subtype: "CDB",
    institution: "Banco Inter",
    issuer: "Banco Inter",
    balance: 26_418.93,
    amountOriginal: 24_000,
    dueInMonths: 22,
    rateType: "CDI",
    rate: 110,
  },
  {
    id: "demo-inv-lci",
    itemId: "demo-item-inter",
    name: "LCI Inter 94% CDI",
    type: "FIXED_INCOME",
    subtype: "LCI",
    institution: "Banco Inter",
    issuer: "Banco Inter",
    balance: 15_730.44,
    amountOriginal: 14_500,
    dueInMonths: 14,
    rateType: "CDI",
    rate: 94,
  },
  {
    id: "demo-inv-caixinha",
    itemId: "demo-item-nubank",
    name: "Caixinha Reserva de emergência",
    type: "FIXED_INCOME",
    subtype: "CDB",
    institution: "Nu Financeira",
    issuer: "Nu Financeira",
    balance: 19_284.07,
    amountOriginal: 18_000,
    rateType: "CDI",
    rate: 100,
  },
  {
    id: "demo-inv-itub4",
    itemId: "demo-item-inter",
    name: "ITAU UNIBANCO HOLDING S.A. ITUB4",
    code: "ITUB4",
    type: "EQUITY",
    subtype: "STOCK",
    institution: "Inter DTVM",
    balance: 23_220,
    amountOriginal: 19_680,
    quantity: 600,
    dividends: 612.4,
  },
  {
    id: "demo-inv-petr4",
    itemId: "demo-item-inter",
    name: "PETROLEO BRASILEIRO S.A. PETR4",
    code: "PETR4",
    type: "EQUITY",
    subtype: "STOCK",
    institution: "Inter DTVM",
    balance: 15_384,
    amountOriginal: 14_920,
    quantity: 400,
    dividends: 1_148.2,
  },
  {
    id: "demo-inv-wege3",
    itemId: "demo-item-inter",
    name: "WEG S.A. WEGE3",
    code: "WEGE3",
    type: "EQUITY",
    subtype: "STOCK",
    institution: "Inter DTVM",
    balance: 9_870,
    amountOriginal: 10_640,
    quantity: 250,
    dividends: 96.3,
  },
  {
    id: "demo-inv-hglg11",
    itemId: "demo-item-inter",
    name: "CSHG LOGISTICA FII HGLG11",
    code: "HGLG11",
    type: "EQUITY",
    subtype: "REAL_ESTATE_FUND",
    institution: "Inter DTVM",
    balance: 12_960,
    amountOriginal: 12_150,
    quantity: 80,
    dividends: 704,
  },
  {
    id: "demo-inv-knri11",
    itemId: "demo-item-inter",
    name: "KINEA RENDA IMOBILIARIA FII KNRI11",
    code: "KNRI11",
    type: "EQUITY",
    subtype: "REAL_ESTATE_FUND",
    institution: "Inter DTVM",
    balance: 8_442,
    amountOriginal: 8_100,
    quantity: 60,
    dividends: 396,
  },
  {
    id: "demo-inv-ivvb11",
    itemId: "demo-item-inter",
    name: "ISHARES S&P 500 IVVB11",
    code: "IVVB11",
    type: "ETF",
    subtype: "ETF",
    institution: "Inter DTVM",
    balance: 18_652.5,
    amountOriginal: 14_300,
    quantity: 50,
  },
  {
    id: "demo-inv-bova11",
    itemId: "demo-item-inter",
    name: "ISHARES IBOVESPA BOVA11",
    code: "BOVA11",
    type: "ETF",
    subtype: "ETF",
    institution: "Inter DTVM",
    balance: 9_315,
    amountOriginal: 8_820,
    quantity: 70,
  },
  {
    id: "demo-inv-multimercado",
    itemId: "demo-item-inter",
    name: "Verde AM Multimercado FIC FIM",
    type: "MUTUAL_FUND",
    subtype: "MULTIMARKET_FUND",
    institution: "Banco Inter",
    issuer: "Verde Asset",
    balance: 11_208.36,
    amountOriginal: 10_000,
  },
  {
    id: "demo-inv-prev",
    itemId: "demo-item-nubank",
    name: "Nu Previdência Seletor PGBL",
    type: "SECURITY",
    subtype: "RETIREMENT",
    institution: "Nu Financeira",
    issuer: "Nu Financeira",
    balance: 7_946.12,
    amountOriginal: 7_200,
  },
];

function buildInvestments(now: Date, itemId: string): Investment[] {
  return investmentSpecs
    .filter((spec) => spec.itemId === itemId)
    .map(
      (spec) =>
        ({
          id: spec.id,
          itemId: spec.itemId,
          name: spec.name,
          code: spec.code ?? null,
          isin: null,
          number: null,
          owner: "Marina Costa",
          type: spec.type,
          subtype: spec.subtype,
          currencyCode: "BRL",
          date: now,
          value: spec.quantity
            ? roundCurrency(spec.balance / spec.quantity)
            : null,
          quantity: spec.quantity ?? null,
          amount: spec.balance,
          taxes: null,
          taxes2: null,
          balance: spec.balance,
          dueDate: spec.dueInMonths
            ? localNoon(
                now.getUTCFullYear(),
                now.getUTCMonth() + spec.dueInMonths,
                1,
              )
            : null,
          rate: spec.rate ?? null,
          rateType: spec.rateType ?? null,
          fixedAnnualRate: null,
          annualRate: null,
          lastMonthRate: null,
          lastTwelveMonthsRate: null,
          amountProfit: roundCurrency(
            spec.balance - spec.amountOriginal + (spec.dividends ?? 0),
          ),
          amountWithdrawal: null,
          amountOriginal: spec.amountOriginal,
          status: "ACTIVE",
          institution: { name: spec.institution, number: null },
          issuer: spec.issuer ?? null,
          issueDate: null,
          metadata: null,
          providerId: null,
        }) as unknown as Investment,
    );
}

function buildInvestmentTransactions(
  now: Date,
  investmentId: string,
): InvestmentTransaction[] {
  const spec = investmentSpecs.find(
    (candidate) => candidate.id === investmentId,
  );

  if (!spec?.dividends) {
    return [];
  }

  const monthly = roundCurrency(spec.dividends / 6);

  return Array.from({ length: 6 }, (_, index) => ({
    id: `demo-inv-tx-${spec.id}-${index}`,
    type: "INTEREST",
    movementType: "CREDIT",
    amount: monthly,
    netAmount: monthly,
    date: localNoon(now.getUTCFullYear(), now.getUTCMonth() - index, 15),
    tradeDate: localNoon(now.getUTCFullYear(), now.getUTCMonth() - index, 15),
    description: "Rendimentos",
  })) as unknown as InvestmentTransaction[];
}

function toDateBoundary(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const timestamp = Date.parse(
    value.length === 10 ? `${value}T00:00:00.000Z` : value,
  );

  return Number.isNaN(timestamp) ? fallback : timestamp;
}

function page<T>(results: T[]): PageResponse<T> {
  return { results, total: results.length, totalPages: 1, page: 1 };
}

/** A stand-in for PluggyClient covering every call Worthly makes. */
export function createDemoPluggyClient(now = new Date()): PluggyClient {
  const transactions = buildTransactions(now);
  const accounts = buildAccounts(transactions, now);
  const pluggyTransactions = transactions.map(toPluggyTransaction);

  const client = {
    async fetchItem(itemId: string) {
      const connectorName =
        connectorNames[itemId as DemoItemId] ?? "Banco demo";

      return {
        id: itemId,
        status: "UPDATED",
        executionStatus: "SUCCESS",
        connector: {
          id: 0,
          name: connectorName,
          imageUrl: null,
          primaryColor: null,
        },
        createdAt: now,
        updatedAt: now,
        lastUpdatedAt: now,
      } as unknown as Item;
    },
    async fetchAccounts(itemId: string) {
      return page(accounts.filter((account) => account.itemId === itemId));
    },
    async fetchAllTransactions(
      accountId: string,
      options: { dateFrom?: string; dateTo?: string } = {},
    ) {
      const from = toDateBoundary(options.dateFrom, Number.NEGATIVE_INFINITY);
      const to = toDateBoundary(options.dateTo, Number.POSITIVE_INFINITY);

      return pluggyTransactions.filter(
        (transaction) =>
          transaction.accountId === accountId &&
          transaction.date.getTime() >= from &&
          transaction.date.getTime() < to,
      );
    },
    async fetchCreditCardBills(accountId: string) {
      const spec = accountSpecs.find((candidate) => candidate.id === accountId);
      return page(spec ? buildBills(transactions, spec, now) : []);
    },
    async fetchInvestments(itemId: string) {
      return page(buildInvestments(now, itemId));
    },
    async fetchAllInvestmentTransactions(investmentId: string) {
      return buildInvestmentTransactions(now, investmentId);
    },
  };

  return client as unknown as PluggyClient;
}
