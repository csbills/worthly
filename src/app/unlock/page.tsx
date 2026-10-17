import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { UnlockPanel } from "@/components/auth/passkeys";
import { getCurrentSession } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/auth/routes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Desbloquear" };

export default async function UnlockPage({
  searchParams,
}: PageProps<"/unlock">) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : null);
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (!session.locked) {
    redirect(nextPath);
  }

  return (
    <AuthShell
      title={`Olá, ${session.user.firstName}`}
      description="O Bytewave foi bloqueado enquanto estava em segundo plano. Confirme que é você para continuar."
    >
      <UnlockPanel next={nextPath} />
    </AuthShell>
  );
}
