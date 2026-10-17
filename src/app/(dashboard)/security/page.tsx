import { FingerPrintIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Metadata } from "next";

import { listPasskeys, type PasskeyListItem } from "@/actions/passkeys";
import {
  AddPasskeyButton,
  DeletePasskeyButton,
} from "@/components/auth/passkeys";
import { Badge, Card, CardDescription, PageHeader } from "@/components/ui/card";
import { LOCK_AFTER_MS } from "@/lib/auth/app-lock";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Segurança" };

const lockMinutes = LOCK_AFTER_MS / 60_000;

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

function PasskeyRow({ passkey }: { passkey: PasskeyListItem }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <HugeiconsIcon icon={FingerPrintIcon} className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {passkey.name}
          <Badge tone={passkey.backedUp ? "info" : "neutral"}>
            {passkey.backedUp ? "Sincronizada" : "Só neste aparelho"}
          </Badge>
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          Criada em {dateFormat.format(passkey.createdAt)}
          {passkey.lastUsedAt
            ? ` · Último uso em ${dateFormat.format(passkey.lastUsedAt)}`
            : " · Ainda não usada"}
        </p>
      </div>
      <DeletePasskeyButton id={passkey.id} />
    </li>
  );
}

export default async function SecurityPage() {
  const passkeys = await listPasskeys();
  const hasPasskeys = passkeys.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Configurações"
        title="Segurança"
        description="Entre e desbloqueie o app com Face ID, Touch ID ou a biometria do Android, sem digitar a senha."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="surface min-w-0 overflow-hidden">
          <div className="flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-medium">Chaves de acesso</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                A chave fica no aparelho e só a parte pública vem para cá.
              </p>
            </div>
            <AddPasskeyButton hasPasskeys={hasPasskeys} />
          </div>

          {hasPasskeys ? (
            <ul className="divide-y">
              {passkeys.map((passkey) => (
                <PasskeyRow key={passkey.id} passkey={passkey} />
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Nenhuma chave de acesso cadastrada. Ative neste aparelho para
              entrar com Face ID ou biometria.
            </p>
          )}
        </section>

        <Card className="gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">Bloqueio do app</h2>
            <Badge tone={hasPasskeys ? "success" : "neutral"}>
              {hasPasskeys ? "Ativado" : "Desativado"}
            </Badge>
          </div>
          <CardDescription>
            {hasPasskeys
              ? `Depois de ${lockMinutes} minutos em segundo plano, o Worthly pede Face ID ou biometria para abrir de novo. Num aparelho sem chave de acesso, dá para desbloquear com a senha.`
              : `Cadastre uma chave de acesso para ativar: depois de ${lockMinutes} minutos em segundo plano, o Worthly vai pedir Face ID ou biometria para abrir de novo.`}
          </CardDescription>
        </Card>
      </div>
    </>
  );
}
