"use client";

import {
  AddSquareIcon,
  Download04Icon,
  Logout01Icon,
  Plug01Icon,
  Share08Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { logout } from "@/actions/auth";
import { useInstallState } from "@/components/pwa";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { SessionUser } from "@/lib/auth/session";

function initials(user: SessionUser) {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toLocaleUpperCase(
    "pt-BR",
  );
}

/** Safari on iOS has no install prompt: show the two taps instead. */
function IosInstallSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader>
          <SheetTitle>Instalar o Bytewave</SheetTitle>
          <SheetDescription>
            Abra como um app, em tela cheia, direto da tela de início.
          </SheetDescription>
        </SheetHeader>
        <ol className="space-y-3 px-4 text-sm">
          <li className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <HugeiconsIcon icon={Share08Icon} className="size-4" />
            </span>
            Toque em <strong>Compartilhar</strong> na barra do Safari
          </li>
          <li className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <HugeiconsIcon icon={AddSquareIcon} className="size-4" />
            </span>
            Escolha <strong>Adicionar à Tela de Início</strong>
          </li>
        </ol>
      </SheetContent>
    </Sheet>
  );
}

export function UserMenu({ user }: { user: SessionUser }) {
  const [signingOut, startSignOut] = useTransition();
  const install = useInstallState();
  const [iosSheetOpen, setIosSheetOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Conta de ${user.firstName}`}
          className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-foreground text-[11px] font-medium tracking-wide text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/40 sm:size-8"
        >
          {initials(user)}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-60">
          <div className="px-2.5 pt-2 pb-2.5">
            <p className="truncate text-sm font-medium">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/accounts" />}>
            <HugeiconsIcon icon={Plug01Icon} strokeWidth={1.8} />
            Conexões
          </DropdownMenuItem>
          {install.kind !== "unavailable" ? (
            <DropdownMenuItem
              onClick={() =>
                install.kind === "prompt"
                  ? install.install()
                  : setIosSheetOpen(true)
              }
            >
              <HugeiconsIcon icon={Download04Icon} strokeWidth={1.8} />
              Instalar app
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            disabled={signingOut}
            onClick={() => startSignOut(() => logout())}
          >
            <HugeiconsIcon icon={Logout01Icon} strokeWidth={1.8} />
            {signingOut ? "Saindo…" : "Sair"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <IosInstallSheet open={iosSheetOpen} onOpenChange={setIosSheetOpen} />
    </>
  );
}
