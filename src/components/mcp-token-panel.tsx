"use client";

import { useActionState } from "react";

import { createMcpToken, type McpTokenState } from "@/actions/mcp";
import { Button } from "@/components/ui/button";

const empty: McpTokenState = { token: null };

/** Gera o token e mostra, uma única vez, como configurar o cliente. */
export function McpTokenPanel({
  endpoint,
  enabled,
}: {
  endpoint: string;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(createMcpToken, empty);

  return (
    <div className="space-y-3">
      <form action={action}>
        <Button
          type="submit"
          disabled={pending}
          variant={enabled ? "outline" : "default"}
        >
          {pending
            ? "Gerando…"
            : enabled
              ? "Gerar um token novo"
              : "Gerar token de acesso"}
        </Button>
      </form>
      {state.token ? (
        <div className="space-y-2 rounded-xl border bg-muted/50 p-3 text-xs animate-rise-in">
          <p className="font-medium text-foreground">
            Copie agora: este token não aparece de novo.
          </p>
          <code className="block overflow-x-auto rounded-lg bg-background px-2.5 py-2 font-mono whitespace-nowrap select-all">
            {state.token}
          </code>
          <p className="text-muted-foreground">No Claude Code:</p>
          <code className="block overflow-x-auto rounded-lg bg-background px-2.5 py-2 font-mono whitespace-nowrap select-all">
            {`claude mcp add --transport http worthly ${endpoint} --header "Authorization: Bearer ${state.token}"`}
          </code>
          <p className="text-muted-foreground">
            Em outros clientes, use o endereço {endpoint} com o cabeçalho
            Authorization: Bearer e o token.
          </p>
        </div>
      ) : null}
    </div>
  );
}
