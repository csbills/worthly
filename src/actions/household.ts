"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import type { PlanObligation, PlanProfile } from "@/lib/financial-plan";
import {
  defaultFinancialProfile,
  type FinancialProfileView,
} from "@/lib/financial-profile";
import { prisma } from "@/lib/prisma";

export type HouseholdMemberView = { id: string; name: string };

export type HouseholdConnectionView = {
  itemId: string;
  connectorName: string | null;
  memberId: string | null;
};

const householdTypes = ["single", "couple", "family"] as const;
const goals = ["independence", "home", "debt-free", "education", "travel"];
const obligationKinds = [
  "financing",
  "loan",
  "rent",
  "education",
  "alimony",
  "other",
];

function text(formData: FormData, name: string, max = 120) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Número em formato brasileiro ("1.234,56") ou com ponto; vazio vira null. */
function parseNumber(value: string) {
  if (!value) return null;
  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  const number = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function clampInt(value: number | null, min: number, max: number) {
  if (value === null) return null;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function revalidatePlan() {
  revalidatePath("/", "layout");
}

// ---------- Pessoas e conexões ----------

export async function getHousehold(): Promise<{
  members: HouseholdMemberView[];
  connections: HouseholdConnectionView[];
}> {
  await verifySession();

  const [members, connections] = await Promise.all([
    prisma.householdMember.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.pluggyItem.findMany({
      orderBy: { createdAt: "asc" },
      select: { itemId: true, connectorName: true, memberId: true },
    }),
  ]);

  return { members, connections };
}

export async function createHouseholdMember(formData: FormData) {
  await verifySession();

  const name = text(formData, "name", 40);
  if (!name) return;

  await prisma.householdMember.create({ data: { name } });
  revalidatePlan();
}

export async function deleteHouseholdMember(formData: FormData) {
  await verifySession();

  const id = text(formData, "memberId");
  if (id) await prisma.householdMember.deleteMany({ where: { id } });
  revalidatePlan();
}

/** Diz de quem é um banco conectado. memberId vazio tira o dono. */
export async function assignConnectionOwner(formData: FormData) {
  await verifySession();

  const itemId = text(formData, "itemId");
  const memberId = text(formData, "memberId") || null;
  if (!itemId) return;

  const member = memberId
    ? await prisma.householdMember.findUnique({ where: { id: memberId } })
    : null;

  await prisma.pluggyItem.updateMany({
    where: { itemId },
    data: { memberId: member?.id ?? null },
  });
  revalidatePlan();
}

// ---------- Perfil ----------

export async function getFinancialProfile(): Promise<FinancialProfileView> {
  await verifySession();

  const profile = await prisma.financialProfile.findUnique({
    where: { id: "default" },
  });
  if (!profile) return defaultFinancialProfile;

  return {
    householdType: (householdTypes as readonly string[]).includes(
      profile.householdType,
    )
      ? (profile.householdType as PlanProfile["householdType"])
      : "couple",
    dependents: profile.dependents,
    incomeStability:
      profile.incomeStability === "variable" ? "variable" : "stable",
    incomeEarners: profile.incomeEarners,
    birthYear: profile.birthYear,
    targetIndependenceAge: profile.targetIndependenceAge,
    desiredMonthlyCost: profile.desiredMonthlyCost,
    expectedRealReturn: profile.expectedRealReturn,
    withdrawalRate: profile.withdrawalRate,
    emergencyMonths: profile.emergencyMonths,
    mainGoal: profile.mainGoal,
    notes: profile.notes,
    saved: true,
  };
}

export async function saveFinancialProfile(formData: FormData) {
  await verifySession();

  const householdType = text(formData, "householdType");
  const mainGoal = text(formData, "mainGoal");
  const currentYear = new Date().getUTCFullYear();
  const desiredMonthlyCost = parseNumber(text(formData, "desiredMonthlyCost"));
  const expectedRealReturn = parseNumber(text(formData, "expectedRealReturn"));
  const withdrawalRate = parseNumber(text(formData, "withdrawalRate"));
  const birthYear = clampInt(
    parseNumber(text(formData, "birthYear")),
    currentYear - 100,
    currentYear - 14,
  );

  const data = {
    householdType: (householdTypes as readonly string[]).includes(householdType)
      ? householdType
      : "couple",
    dependents: clampInt(parseNumber(text(formData, "dependents")), 0, 10) ?? 0,
    incomeStability:
      text(formData, "incomeStability") === "variable" ? "variable" : "stable",
    incomeEarners:
      clampInt(parseNumber(text(formData, "incomeEarners")), 1, 6) ?? 1,
    birthYear,
    mainGoal: goals.includes(mainGoal) ? mainGoal : "independence",
    targetIndependenceAge: clampInt(
      parseNumber(text(formData, "targetIndependenceAge")),
      30,
      90,
    ),
    desiredMonthlyCost:
      desiredMonthlyCost && desiredMonthlyCost > 0 ? desiredMonthlyCost : null,
    // Retornos fora de 0–10% real ao ano tornam a projeção fantasia.
    expectedRealReturn: Math.min(10, Math.max(0, expectedRealReturn ?? 4)),
    withdrawalRate: Math.min(8, Math.max(2, withdrawalRate ?? 4)),
    emergencyMonths: clampInt(
      parseNumber(text(formData, "emergencyMonths")),
      1,
      24,
    ),
    notes: text(formData, "notes", 600) || null,
  };

  await prisma.financialProfile.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });
  revalidatePlan();
}

// ---------- Compromissos ----------

export async function listObligations(): Promise<PlanObligation[]> {
  await verifySession();

  return prisma.obligation.findMany({
    orderBy: { monthlyAmount: "desc" },
    select: {
      id: true,
      name: true,
      kind: true,
      monthlyAmount: true,
      endMonth: true,
      balance: true,
      interestRate: true,
    },
  });
}

export async function saveObligation(formData: FormData) {
  await verifySession();

  const id = text(formData, "obligationId");
  const name = text(formData, "name", 60);
  const kind = text(formData, "kind");
  const monthlyAmount = parseNumber(text(formData, "monthlyAmount"));
  const endMonth = text(formData, "endMonth");
  const balance = parseNumber(text(formData, "balance"));
  const interestRate = parseNumber(text(formData, "interestRate"));

  if (!name || !monthlyAmount || monthlyAmount <= 0) return;

  const data = {
    name,
    kind: obligationKinds.includes(kind) ? kind : "other",
    monthlyAmount: Math.round(monthlyAmount * 100) / 100,
    endMonth: /^\d{4}-(0[1-9]|1[0-2])$/.test(endMonth) ? endMonth : null,
    balance: balance && balance > 0 ? balance : null,
    interestRate:
      interestRate !== null && interestRate >= 0 && interestRate < 100
        ? interestRate
        : null,
  };

  if (id) {
    await prisma.obligation.updateMany({ where: { id }, data });
  } else {
    await prisma.obligation.create({ data });
  }
  revalidatePlan();
}

export async function deleteObligation(formData: FormData) {
  await verifySession();

  const id = text(formData, "obligationId");
  if (id) await prisma.obligation.deleteMany({ where: { id } });
  revalidatePlan();
}
