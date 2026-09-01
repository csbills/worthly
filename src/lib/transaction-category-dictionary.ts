export type ResolvedTransactionCategory = {
  id: string;
  label: string;
  groupId: string;
  groupLabel: string;
  color: string;
  icon: string;
};

type CategoryEntry = {
  id: string;
  name: string;
  label: string;
  parentId?: string;
};

const otherCategoryId = "99999999";

const categoryEntries: readonly CategoryEntry[] = [
  { id: "01000000", name: "Income", label: "Renda" },
  {
    id: "01010000",
    name: "Salary",
    label: "Salário",
    parentId: "01000000",
  },
  {
    id: "01020000",
    name: "Retirement",
    label: "Aposentadoria",
    parentId: "01000000",
  },
  {
    id: "01030000",
    name: "Entrepreneurial activities",
    label: "Atividades de empreendedorismo",
    parentId: "01000000",
  },
  {
    id: "01040000",
    name: "Government aid",
    label: "Auxílio do governo",
    parentId: "01000000",
  },
  {
    id: "01050000",
    name: "Non-recurring income",
    label: "Renda não-recorrente",
    parentId: "01000000",
  },
  {
    id: "02000000",
    name: "Loans and financing",
    label: "Empréstimos e financiamento",
  },
  {
    id: "02010000",
    name: "Late payment and overdraft costs",
    label: "Atraso no pagamento e custos de cheque especial",
    parentId: "02000000",
  },
  {
    id: "02020000",
    name: "Interests charged",
    label: "Juros cobrados",
    parentId: "02000000",
  },
  {
    id: "02030000",
    name: "Financing",
    label: "Financiamento",
    parentId: "02000000",
  },
  {
    id: "02030001",
    name: "Real estate financing",
    label: "Financiamento imobiliário",
    parentId: "02030000",
  },
  {
    id: "02030002",
    name: "Vehicle financing",
    label: "Financiamento de veículos",
    parentId: "02030000",
  },
  {
    id: "02030003",
    name: "Student loan",
    label: "Empréstimo estudantil",
    parentId: "02030000",
  },
  {
    id: "02040000",
    name: "Loans",
    label: "Empréstimos",
    parentId: "02000000",
  },
  { id: "03000000", name: "Investments", label: "Investimentos" },
  {
    id: "03010000",
    name: "Automatic investment",
    label: "Investimento automático",
    parentId: "03000000",
  },
  {
    id: "03020000",
    name: "Fixed income",
    label: "Renda fixa",
    parentId: "03000000",
  },
  {
    id: "03030000",
    name: "Mutual funds",
    label: "Fundos multimercado",
    parentId: "03000000",
  },
  {
    id: "03040000",
    name: "Variable income",
    label: "Renda variável",
    parentId: "03000000",
  },
  {
    id: "03050000",
    name: "Margin",
    label: "Ajuste de margem",
    parentId: "03000000",
  },
  {
    id: "03060000",
    name: "Proceeds interests and dividends",
    label: "Juros de rendimentos de dividendos",
    parentId: "03000000",
  },
  {
    id: "03070000",
    name: "Pension",
    label: "Pensão",
    parentId: "03000000",
  },
  {
    id: "04000000",
    name: "Same person transfer",
    label: "Transferência mesma titularidade",
  },
  {
    id: "04010000",
    name: "Same person transfer - CASH",
    label: "Transferência mesma titularidade - Dinheiro",
    parentId: "04000000",
  },
  {
    id: "04020000",
    name: "Same person transfer - PIX",
    label: "Transferência mesma titularidade - PIX",
    parentId: "04000000",
  },
  {
    id: "04030000",
    name: "Same person transfer - TED",
    label: "Transferência mesma titularidade - TED",
    parentId: "04000000",
  },
  { id: "05000000", name: "Transfers", label: "Transferências" },
  {
    id: "05010000",
    name: "Transfer - Bank Slip",
    label: "Transferência - Boleto bancário",
    parentId: "05000000",
  },
  {
    id: "05020000",
    name: "Transfer - Cash",
    label: "Transferência - Dinheiro",
    parentId: "05000000",
  },
  {
    id: "05030000",
    name: "Transfer - Check",
    label: "Transferência - Cheque",
    parentId: "05000000",
  },
  {
    id: "05040000",
    name: "Transfer - DOC",
    label: "Transferências - DOC",
    parentId: "05000000",
  },
  {
    id: "05050000",
    name: "Transfer - Foreign Exchange",
    label: "Transferência - Câmbio",
    parentId: "05000000",
  },
  {
    id: "05060000",
    name: "Transfer - Internal",
    label: "Transferência - Mesma instituição",
    parentId: "05000000",
  },
  {
    id: "05070000",
    name: "Transfer - PIX",
    label: "Transferência - PIX",
    parentId: "05000000",
  },
  {
    id: "05080000",
    name: "Transfer - TED",
    label: "Transferência - TED",
    parentId: "05000000",
  },
  {
    id: "05090000",
    name: "Third party transfers",
    label: "Transferências para terceiros",
    parentId: "05000000",
  },
  {
    id: "05090001",
    name: "Third party transfer - Bank Slip",
    label: "Transferência para terceiros - Boleto bancário",
    parentId: "05090000",
  },
  {
    id: "05090002",
    name: "Third party transfer - Debit Card",
    label: "Transferência para terceiros - Débito",
    parentId: "05090000",
  },
  {
    id: "05090003",
    name: "Third party transfer - DOC",
    label: "Transferência para terceiros - DOC",
    parentId: "05090000",
  },
  {
    id: "05090004",
    name: "Third party transfer - PIX",
    label: "Transferência para terceiros - PIX",
    parentId: "05090000",
  },
  {
    id: "05090005",
    name: "Third party transfer - TED",
    label: "Transferência para terceiros - TED",
    parentId: "05090000",
  },
  {
    id: "05100000",
    name: "Credit card payment",
    label: "Pagamento de cartão de crédito",
    parentId: "05000000",
  },
  { id: "06000000", name: "Legal obligations", label: "Obrigações legais" },
  {
    id: "06010000",
    name: "Blocked balances",
    label: "Saldo bloqueado",
    parentId: "06000000",
  },
  {
    id: "06020000",
    name: "Alimony",
    label: "Pensão alimentícia",
    parentId: "06000000",
  },
  { id: "07000000", name: "Services", label: "Serviços" },
  {
    id: "07010000",
    name: "Telecommunications",
    label: "Telecomunicação",
    parentId: "07000000",
  },
  {
    id: "07010001",
    name: "Internet",
    label: "Internet",
    parentId: "07010000",
  },
  {
    id: "07010002",
    name: "Mobile",
    label: "Celular",
    parentId: "07010000",
  },
  { id: "07010003", name: "TV", label: "TV", parentId: "07010000" },
  {
    id: "07020000",
    name: "Education",
    label: "Educação",
    parentId: "07000000",
  },
  {
    id: "07020001",
    name: "Online Courses",
    label: "Cursos online",
    parentId: "07020000",
  },
  {
    id: "07020002",
    name: "University",
    label: "Universidade",
    parentId: "07020000",
  },
  {
    id: "07020003",
    name: "School",
    label: "Escola",
    parentId: "07020000",
  },
  {
    id: "07020004",
    name: "Kindergarten",
    label: "Creche",
    parentId: "07020000",
  },
  {
    id: "07030000",
    name: "Wellness and fitness",
    label: "Saúde e bem-estar",
    parentId: "07000000",
  },
  {
    id: "07030001",
    name: "Gyms and fitness centers",
    label: "Academia e centros de lazer",
    parentId: "07030000",
  },
  {
    id: "07030002",
    name: "Sports practice",
    label: "Prática de esportes",
    parentId: "07030000",
  },
  {
    id: "07030003",
    name: "Wellness",
    label: "Bem-estar",
    parentId: "07030000",
  },
  {
    id: "07040000",
    name: "Tickets",
    label: "Bilhetes",
    parentId: "07000000",
  },
  {
    id: "07040001",
    name: "Stadiums and arenas",
    label: "Estádios e arenas",
    parentId: "07040000",
  },
  {
    id: "07040002",
    name: "Landmarks and museums",
    label: "Museus e pontos turísticos",
    parentId: "07040000",
  },
  {
    id: "07040003",
    name: "Cinema, theater and concerts",
    label: "Cinema, Teatro e Concertos",
    parentId: "07040000",
  },
  { id: "08000000", name: "Shopping", label: "Compras" },
  {
    id: "08010000",
    name: "Online shopping",
    label: "Compras online",
    parentId: "08000000",
  },
  {
    id: "08020000",
    name: "Electronics",
    label: "Eletrônicos",
    parentId: "08000000",
  },
  {
    id: "08030000",
    name: "Pet supplies and vet",
    label: "Pet Shops e veterinários",
    parentId: "08000000",
  },
  {
    id: "08040000",
    name: "Clothing",
    label: "Vestuário",
    parentId: "08000000",
  },
  {
    id: "08050000",
    name: "Kids and toys",
    label: "Artigos infantis",
    parentId: "08000000",
  },
  {
    id: "08060000",
    name: "Bookstore",
    label: "Livraria",
    parentId: "08000000",
  },
  {
    id: "08070000",
    name: "Sports goods",
    label: "Artigos esportivos",
    parentId: "08000000",
  },
  {
    id: "08080000",
    name: "Office supplies",
    label: "Papelaria",
    parentId: "08000000",
  },
  {
    id: "08090000",
    name: "Cashback",
    label: "Cashback",
    parentId: "08000000",
  },
  { id: "09000000", name: "Digital services", label: "Serviços digitais" },
  {
    id: "09010000",
    name: "Gaming",
    label: "Jogos e videogames",
    parentId: "09000000",
  },
  {
    id: "09020000",
    name: "Video streaming",
    label: "Streaming de vídeo",
    parentId: "09000000",
  },
  {
    id: "09030000",
    name: "Music streaming",
    label: "Streaming de música",
    parentId: "09000000",
  },
  { id: "10000000", name: "Groceries", label: "Supermercado" },
  {
    id: "11000000",
    name: "Food and drinks",
    label: "Alimentos e bebidas",
  },
  {
    id: "11010000",
    name: "Eating out",
    label: "Restaurantes, bares e lanchonetes",
    parentId: "11000000",
  },
  {
    id: "11020000",
    name: "Food delivery",
    label: "Delivery de alimentos",
    parentId: "11000000",
  },
  { id: "12000000", name: "Travel", label: "Viagens" },
  {
    id: "12010000",
    name: "Airport and airlines",
    label: "Aeroportos e cias. aéreas",
    parentId: "12000000",
  },
  {
    id: "12020000",
    name: "Accomodation",
    label: "Hospedagem",
    parentId: "12000000",
  },
  {
    id: "12030000",
    name: "Mileage programs",
    label: "Programas de milhagem",
    parentId: "12000000",
  },
  {
    id: "12040000",
    name: "Bus tickets",
    label: "Passagem de ônibus",
    parentId: "12000000",
  },
  { id: "13000000", name: "Donations", label: "Doações" },
  { id: "14000000", name: "Gambling", label: "Apostas" },
  {
    id: "14010000",
    name: "Lottery",
    label: "Loteria",
    parentId: "14000000",
  },
  {
    id: "14020000",
    name: "Online bet",
    label: "Apostas online",
    parentId: "14000000",
  },
  { id: "15000000", name: "Taxes", label: "Impostos" },
  {
    id: "15010000",
    name: "Income taxes",
    label: "Imposto de renda",
    parentId: "15000000",
  },
  {
    id: "15020000",
    name: "Taxes on investments",
    label: "Imposto sobre investimentos",
    parentId: "15000000",
  },
  {
    id: "15030000",
    name: "Tax on financial operations",
    label: "Impostos sobre operações financeiras",
    parentId: "15000000",
  },
  { id: "16000000", name: "Bank fees", label: "Taxas bancárias" },
  {
    id: "16010000",
    name: "Account fees",
    label: "Taxas de conta corrente",
    parentId: "16000000",
  },
  {
    id: "16020000",
    name: "Wire transfer fees and ATM fees",
    label: "Taxas sobre transferências e caixa eletrônico",
    parentId: "16000000",
  },
  {
    id: "16030000",
    name: "Credit card fees",
    label: "Taxas de cartão de crédito",
    parentId: "16000000",
  },
  { id: "17000000", name: "Housing", label: "Moradia" },
  {
    id: "17010000",
    name: "Rent",
    label: "Aluguel",
    parentId: "17000000",
  },
  {
    id: "17020000",
    name: "Utilities",
    label: "Serviços de utilidade pública",
    parentId: "17000000",
  },
  {
    id: "17020001",
    name: "Water",
    label: "Água",
    parentId: "17020000",
  },
  {
    id: "17020002",
    name: "Electricity",
    label: "Eletricidade",
    parentId: "17020000",
  },
  {
    id: "17020003",
    name: "Gas",
    label: "Gás",
    parentId: "17020000",
  },
  {
    id: "17030000",
    name: "Houseware",
    label: "Utensílios para casa",
    parentId: "17000000",
  },
  {
    id: "17040000",
    name: "Urban land and building tax",
    label: "Impostos sobre moradia",
    parentId: "17000000",
  },
  { id: "18000000", name: "Healthcare", label: "Saúde" },
  {
    id: "18010000",
    name: "Dentist",
    label: "Dentista",
    parentId: "18000000",
  },
  {
    id: "18020000",
    name: "Pharmacy",
    label: "Farmácia",
    parentId: "18000000",
  },
  {
    id: "18030000",
    name: "Optometry",
    label: "Ótica",
    parentId: "18000000",
  },
  {
    id: "18040000",
    name: "Hospital clinics and labs",
    label: "Hospitais, clínicas e laboratórios",
    parentId: "18000000",
  },
  { id: "19000000", name: "Transportation", label: "Transporte" },
  {
    id: "19010000",
    name: "Taxi and ride-hailing",
    label: "Táxi e transporte privado urbano",
    parentId: "19000000",
  },
  {
    id: "19020000",
    name: "Public transportation",
    label: "Transporte público",
    parentId: "19000000",
  },
  {
    id: "19030000",
    name: "Car rental",
    label: "Aluguel de veículos",
    parentId: "19000000",
  },
  {
    id: "19040000",
    name: "Bicycle",
    label: "Aluguel de bicicletas",
    parentId: "19000000",
  },
  {
    id: "19050000",
    name: "Automotive",
    label: "Serviços automotivos",
    parentId: "19000000",
  },
  {
    id: "19050001",
    name: "Gas stations",
    label: "Postos de gasolina",
    parentId: "19050000",
  },
  {
    id: "19050002",
    name: "Parking",
    label: "Estacionamentos",
    parentId: "19050000",
  },
  {
    id: "19050003",
    name: "Tolls and in vehicle payment",
    label: "Pedágios e pagamentos no veículo",
    parentId: "19050000",
  },
  {
    id: "19050004",
    name: "Vehicle ownership taxes and fees",
    label: "Taxas e impostos sobre veículos",
    parentId: "19050000",
  },
  {
    id: "19050005",
    name: "Vehicle maintenance",
    label: "Manutenção de veículos",
    parentId: "19050000",
  },
  {
    id: "19050006",
    name: "Traffic tickets",
    label: "Multas de trânsito",
    parentId: "19050000",
  },
  { id: "20000000", name: "Insurance", label: "Seguros" },
  {
    id: "200100000",
    name: "Life insurance",
    label: "Seguro de vida",
    parentId: "20000000",
  },
  {
    id: "200200000",
    name: "Home insurance",
    label: "Seguro residencial",
    parentId: "20000000",
  },
  {
    id: "200300000",
    name: "Health insurance",
    label: "Seguro saúde",
    parentId: "20000000",
  },
  {
    id: "200400000",
    name: "Vehicle insurance",
    label: "Seguro de veículos",
    parentId: "20000000",
  },
  { id: "21000000", name: "Leisure", label: "Lazer" },
  { id: otherCategoryId, name: "Other", label: "Outros" },
];

export const transactionCategoryGroupColors: Record<string, string> = {
  "01000000": "#16a34a",
  "02000000": "#f97316",
  "03000000": "#0f766e",
  "04000000": "#64748b",
  "05000000": "#22c55e",
  "06000000": "#e11d48",
  "07000000": "#8b5cf6",
  "08000000": "#ec4899",
  "09000000": "#6366f1",
  "10000000": "#84cc16",
  "11000000": "#f97316",
  "12000000": "#f59e0b",
  "13000000": "#06b6d4",
  "14000000": "#ef4444",
  "15000000": "#475569",
  "16000000": "#0d9488",
  "17000000": "#0891b2",
  "18000000": "#dc2626",
  "19000000": "#2563eb",
  "20000000": "#7c3aed",
  "21000000": "#db2777",
  [otherCategoryId]: "#94a3b8",
};

export const transactionCategoryGroupIcons: Record<string, string> = {
  "01000000": "💰",
  "02000000": "🏦",
  "03000000": "📈",
  "04000000": "🔄",
  "05000000": "↔️",
  "06000000": "⚖️",
  "07000000": "🛠️",
  "08000000": "🛍️",
  "09000000": "💻",
  "10000000": "🛒",
  "11000000": "🍽️",
  "12000000": "✈️",
  "13000000": "🤝",
  "14000000": "🎰",
  "15000000": "🧾",
  "16000000": "💳",
  "17000000": "🏠",
  "18000000": "🩺",
  "19000000": "🚗",
  "20000000": "🛡️",
  "21000000": "🎟️",
  [otherCategoryId]: "📦",
};

const categoriesById = new Map(
  categoryEntries.map((category) => [category.id, category]),
);
const categoryIdsByName = new Map(
  categoryEntries.flatMap((category) => [
    [normalizeCategoryName(category.name), category.id],
    [normalizeCategoryName(category.label), category.id],
  ]),
);

function normalizeCategoryName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function getCategoryEntry(categoryId: string | null, category: string | null) {
  if (categoryId) {
    const categoryFromId = categoriesById.get(categoryId);

    if (categoryFromId) {
      return categoryFromId;
    }
  }

  const categoryIdFromName = category
    ? categoryIdsByName.get(normalizeCategoryName(category))
    : undefined;

  return categoryIdFromName
    ? categoriesById.get(categoryIdFromName)
    : undefined;
}

function getRootCategory(category: CategoryEntry) {
  let rootCategory = category;

  while (rootCategory.parentId) {
    const parentCategory = categoriesById.get(rootCategory.parentId);

    if (!parentCategory) {
      break;
    }

    rootCategory = parentCategory;
  }

  return rootCategory;
}

export function translateTransactionCategory(
  category: string | null,
  categoryId?: string | null,
) {
  const categoryEntry = getCategoryEntry(categoryId ?? null, category);

  return categoryEntry?.label || category?.trim() || "Sem categoria";
}

export function getTransactionCategory(
  categoryId: string | null,
  category: string | null,
): ResolvedTransactionCategory {
  const categoryEntry = getCategoryEntry(categoryId, category);
  const fallbackCategory = categoriesById.get(otherCategoryId);

  if (!categoryEntry || !fallbackCategory) {
    return {
      id: `unknown:${normalizeCategoryName(category || "sem categoria")}`,
      label: category?.trim() || "Sem categoria",
      groupId: otherCategoryId,
      groupLabel: "Outros",
      color: transactionCategoryGroupColors[otherCategoryId],
      icon: transactionCategoryGroupIcons[otherCategoryId],
    };
  }

  const rootCategory = getRootCategory(categoryEntry);

  return {
    id: categoryEntry.id,
    label: categoryEntry.label,
    groupId: rootCategory.id,
    groupLabel: rootCategory.label,
    color:
      transactionCategoryGroupColors[rootCategory.id] ??
      transactionCategoryGroupColors[otherCategoryId],
    icon:
      transactionCategoryGroupIcons[rootCategory.id] ??
      transactionCategoryGroupIcons[otherCategoryId],
  };
}
