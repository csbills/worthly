"use client";

import { useActionState, useState } from "react";

import {
  type AssistantKeyFormState,
  saveAssistantProvider,
} from "@/actions/assistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectTriggerVariants } from "@/components/ui/select-variants";
import {
  type AssistantProviderId,
  assistantProviderOptions,
  getAssistantProviderOption,
} from "@/lib/assistant/providers/options";
import { cn } from "@/lib/utils";

const idle: AssistantKeyFormState = { status: "idle" };

/** Escolhe o modelo do Tito e valida a chave antes de salvar. */
export function AssistantKeyForm({
  current,
}: {
  current?: {
    provider: AssistantProviderId;
    model: string | null;
    baseUrl: string | null;
    keySaved: boolean;
  };
}) {
  const [state, action, pending] = useActionState(saveAssistantProvider, idle);
  const [provider, setProvider] = useState<AssistantProviderId>(
    current?.provider ?? "anthropic",
  );
  const option = getAssistantProviderOption(provider);
  const sameAsCurrent = current?.provider === provider;
  const keepKey = sameAsCurrent && current?.keySaved;

  return (
    <form action={action} className="space-y-3 text-left">
      <label htmlFor="assistant-provider" className="block space-y-1.5">
        <span className="block text-sm font-medium">Modelo de linguagem</span>
        <select
          id="assistant-provider"
          name="provider"
          value={provider}
          onChange={(event) =>
            setProvider(event.target.value as AssistantProviderId)
          }
          className={cn(
            selectTriggerVariants({ size: "lg" }),
            "appearance-auto",
          )}
        >
          {assistantProviderOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="assistant-key" className="block space-y-1.5">
        <span className="block text-sm font-medium">Chave da API</span>
        <Input
          key={provider}
          id="assistant-key"
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder={keepKey ? "Manter a chave salva" : option.keyPlaceholder}
          required={!keepKey}
          className="h-11 md:h-10"
        />
        {option.keysUrl ? (
          <span className="block text-xs text-muted-foreground">
            Crie uma em{" "}
            <a
              href={option.keysUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {new URL(option.keysUrl).host}
            </a>
            .
          </span>
        ) : null}
      </label>

      {provider !== "anthropic" ? (
        <label htmlFor="assistant-base-url" className="block space-y-1.5">
          <span className="block text-sm font-medium">Endereço da API</span>
          <Input
            key={`url-${provider}`}
            id="assistant-base-url"
            name="baseUrl"
            type="url"
            defaultValue={
              (sameAsCurrent ? current?.baseUrl : null) ??
              option.defaultBaseUrl ??
              ""
            }
            placeholder="https://api.exemplo.com/v1"
            required={!option.defaultBaseUrl}
            className="h-11 md:h-10"
          />
        </label>
      ) : null}

      <label htmlFor="assistant-model" className="block space-y-1.5">
        <span className="block text-sm font-medium">Modelo</span>
        <Input
          key={`model-${provider}`}
          id="assistant-model"
          name="model"
          defaultValue={
            (sameAsCurrent ? current?.model : null) ?? option.defaultModel ?? ""
          }
          placeholder="nome-do-modelo"
          required={!option.defaultModel}
          className="h-11 md:h-10"
        />
      </label>

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
        {pending ? "Validando…" : current ? "Salvar" : "Ativar o Tito"}
      </Button>
    </form>
  );
}
