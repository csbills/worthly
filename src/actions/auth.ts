"use server";

import { redirect } from "next/navigation";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  clearLoginFailures,
  isLoginLocked,
  recordLoginFailure,
} from "@/lib/auth/rate-limit";
import { createSession, deleteSession } from "@/lib/auth/session";
import { isFirstAccess } from "@/lib/auth/users";
import {
  type FieldErrors,
  parseLoginForm,
  parseSignupForm,
} from "@/lib/auth/validation";
import { prisma } from "@/lib/prisma";

export type AuthFormState = {
  status: "idle" | "error";
  message?: string;
  errors?: FieldErrors<string>;
  values?: Record<string, string>;
};

// Compared against when the email is unknown, so a miss costs the same time
// as a wrong password and does not reveal which accounts exist.
const timingDecoy = hashPassword("bytewave-timing-decoy");

export async function signup(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  // Signup only exists for the very first person: the instance owner.
  if (!(await isFirstAccess())) {
    redirect("/login");
  }

  const parsed = parseSignupForm(formData);

  if (!parsed.success) {
    return { status: "error", errors: parsed.errors, values: parsed.values };
  }

  const { password, ...profile } = parsed.data;
  const user = await prisma.user.create({
    data: { ...profile, passwordHash: await hashPassword(password) },
    select: { id: true },
  });

  await createSession(user.id);
  redirect("/onboarding");
}

export async function login(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseLoginForm(formData);

  if (!parsed.success) {
    return { status: "error", errors: parsed.errors, values: parsed.values };
  }

  const { email, password } = parsed.data;

  if (isLoginLocked(email)) {
    return {
      status: "error",
      message: "Muitas tentativas. Aguarde 15 minutos e tente de novo.",
      values: { email },
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
  const valid = await verifyPassword(
    password,
    user?.passwordHash ?? (await timingDecoy),
  );

  if (!user || !valid) {
    recordLoginFailure(email);
    return {
      status: "error",
      message: "E-mail ou senha incorretos.",
      values: { email },
    };
  }

  clearLoginFailures(email);
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
