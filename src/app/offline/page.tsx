import type { Metadata } from "next";

import { LogoMark } from "@/components/brand";
import { ReloadButton } from "@/components/pwa";

export const metadata: Metadata = { title: "Sem conexão" };

/** Precached by the service worker and shown when a navigation fails. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <LogoMark className="size-12 text-primary" />
      <h1 className="mt-6 text-[1.625rem] leading-tight font-normal tracking-[-0.03em]">
        Você está offline
      </h1>
      <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
        Seus dados financeiros não ficam salvos no aparelho. Assim que a conexão
        voltar, o painel abre normalmente.
      </p>
      <ReloadButton />
    </main>
  );
}
