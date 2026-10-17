import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/auth-forms";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/lib/auth/dal";
import { isFirstAccess } from "@/lib/auth/users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignupPage() {
  // Only the first visitor can sign up: they become the instance owner.
  if (!(await isFirstAccess())) {
    redirect((await getCurrentUser()) ? "/" : "/login");
  }

  return (
    <AuthShell
      title="Crie sua conta"
      description="Este é o primeiro acesso a esta instância. A conta que você criar agora será a única com acesso aos seus dados."
      footer="Seus dados ficam no servidor desta instância. A senha é guardada apenas como hash."
    >
      <SignupForm />
    </AuthShell>
  );
}
