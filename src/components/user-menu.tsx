"use client";

import { Logout01Icon, Plug01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useTransition } from "react";

import { logout } from "@/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/lib/auth/session";

function initials(user: SessionUser) {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toLocaleUpperCase(
    "pt-BR",
  );
}

export function UserMenu({ user }: { user: SessionUser }) {
  const [signingOut, startSignOut] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Conta de ${user.firstName}`}
        className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-foreground text-[11px] font-medium tracking-wide text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        {initials(user)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <div className="px-2.5 pt-2 pb-2.5">
          <p className="truncate text-sm font-medium">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/accounts" />}>
          <HugeiconsIcon icon={Plug01Icon} strokeWidth={1.8} />
          Conexões
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={signingOut}
          onClick={() => startSignOut(() => logout())}
        >
          <HugeiconsIcon icon={Logout01Icon} strokeWidth={1.8} />
          {signingOut ? "Saindo…" : "Sair"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
