import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/auth-forms";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/lib/auth/dal";
import { isFirstAccess } from "@/lib/auth/users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage() {
  if (await isFirstAccess()) {
    redirect("/signup");
  }

  if (await getCurrentUser()) {
    redirect("/");
  }

  return (
    <AuthShell
      title="Bem-vindo de volta"
      description="Entre para ver suas finanças."
    >
      <LoginForm />
    </AuthShell>
  );
}
