"use client";

import { useActionState } from "react";

import {
  type AssistantKeyFormState,
  saveAnthropicApiKey,
} from "@/actions/assistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const idle: AssistantKeyFormState = { status: "idle" };

export function AssistantKeyForm() {
  const [state, action, pending] = useActionState(saveAnthropicApiKey, idle);

  return (
    <form action={action} className="space-y-3 text-left">
      <label htmlFor="anthropic-key" className="block text-sm font-medium">
        Chave da API da Anthropic
      </label>
      <Input
        id="anthropic-key"
        name="apiKey"
        type="password"
        autoComplete="off"
        placeholder="sk-ant-…"
        required
        className="h-11 md:h-10"
      />
      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={
            state.status === "error"
              ? "text-sm text-destructive-foreground"
              : "text-sm text-success-foreground"
          }
        >
          {state.message}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-11 w-full md:h-10"
      >
        {pending ? "Validando…" : "Ativar o Tito"}
      </Button>
    </form>
  );
}
