"use client";

import {
  CheckmarkCircle02Icon,
  Delete02Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  addPluggyConnection,
  type FormActionState,
  type OnboardingState,
  type PluggyConnectionSummary,
  removePluggyConnection,
  savePluggyCredentials,
} from "@/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const idle: FormActionState = { status: "idle" };

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending ? (
        <>
          <Spinner />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

function FieldMessage({ state }: { state: FormActionState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 text-sm leading-5",
        state.status === "error"
          ? "text-destructive-foreground"
          : "text-success-foreground",
      )}
    >
      {state.status === "success" ? (
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          className="mt-px size-4 shrink-0"
          strokeWidth={2}
        />
      ) : null}
      {state.message}
    </p>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function PluggyCredentialsForm({
  onSaved,
  submitLabel = "Validar e salvar",
}: {
  onSaved?: () => void;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(savePluggyCredentials, idle);
  const [revealed, setRevealed] = useState(false);
  const notified = useRef<FormActionState | null>(null);

  useEffect(() => {
    if (state.status === "success" && notified.current !== state) {
      notified.current = state;
      onSaved?.();
    }
  }, [state, onSaved]);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Client ID" htmlFor="pluggy-client-id">
        <Input
          key={state.fields?.clientId}
          id="pluggy-client-id"
          name="clientId"
          defaultValue={state.fields?.clientId}
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="font-mono text-[13px]"
        />
      </Field>
      <Field
        label="Client Secret"
        htmlFor="pluggy-client-secret"
        hint="Fica guardado apenas no servidor da sua instância e nunca volta para o navegador."
      >
        <div className="relative">
          <Input
            id="pluggy-client-secret"
            name="clientSecret"
            type={revealed ? "text" : "password"}
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="••••••••••••••••••••••••"
            className="pr-10 font-mono text-[13px]"
          />
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={
              revealed ? "Ocultar Client Secret" : "Mostrar Client Secret"
            }
            className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <HugeiconsIcon
              icon={revealed ? ViewOffSlashIcon : ViewIcon}
              className="size-4"
              strokeWidth={1.8}
            />
          </button>
        </div>
      </Field>
      <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <FieldMessage state={state} />
        <SubmitButton
          pendingLabel="Validando com a Pluggy…"
          className="sm:ml-auto"
        >
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}

export function PluggyConnectionForm() {
  const [state, formAction] = useActionState(addPluggyConnection, idle);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <Field label="Item ID" htmlFor="pluggy-item-id">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            key={state.fields?.itemId}
            id="pluggy-item-id"
            name="itemId"
            defaultValue={state.fields?.itemId}
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="font-mono text-[13px]"
          />
          <SubmitButton pendingLabel="Verificando…" className="shrink-0">
            Adicionar conexão
          </SubmitButton>
        </div>
      </Field>
      <FieldMessage state={state} />
    </form>
  );
}

const itemStatusLabels: Record<string, { label: string; tone: string }> = {
  UPDATED: {
    label: "Sincronizado",
    tone: "bg-success/10 text-success-foreground",
  },
  UPDATING: { label: "Sincronizando", tone: "bg-info/10 text-info-foreground" },
  LOGIN_ERROR: {
    label: "Requer login",
    tone: "bg-destructive/10 text-destructive-foreground",
  },
  OUTDATED: {
    label: "Desatualizado",
    tone: "bg-warning/12 text-warning-foreground",
  },
  WAITING_USER_INPUT: {
    label: "Aguardando você",
    tone: "bg-warning/12 text-warning-foreground",
  },
};

export function ConnectionList({
  connections,
}: {
  connections: PluggyConnectionSummary[];
}) {
  if (connections.length === 0) {
    return null;
  }

  return (
    <ul className="divide-y overflow-hidden rounded-xl border">
      {connections.map((connection) => {
        const status = connection.status
          ? itemStatusLabels[connection.status]
          : undefined;

        return (
          <li
            key={connection.itemId}
            className="flex items-center gap-3 bg-card px-3.5 py-3"
          >
            {connection.connectorImageUrl ? (
              // biome-ignore lint/performance/noImgElement: remote connector logos from Pluggy's CDN
              <img
                src={connection.connectorImageUrl}
                alt=""
                className="size-8 shrink-0 rounded-lg border bg-white object-contain p-1"
              />
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                {(connection.connectorName ?? "?").slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {connection.connectorName ?? "Conexão Pluggy"}
              </p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {connection.itemId}
              </p>
            </div>
            {status ? (
              <span
                className={cn(
                  "hidden h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium sm:inline-flex",
                  status.tone,
                )}
              >
                {status.label}
              </span>
            ) : null}
            <form action={removePluggyConnection}>
              <input type="hidden" name="itemId" value={connection.itemId} />
              <button
                type="submit"
                aria-label={`Remover ${connection.connectorName ?? "conexão"}`}
                title="Remover conexão"
                className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive-foreground"
              >
                <HugeiconsIcon
                  icon={Delete02Icon}
                  className="size-4"
                  strokeWidth={1.8}
                />
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Shows which Pluggy application this instance talks to, with a way to swap
 * it. The secret itself never reaches the browser — only a masked client id.
 */
export function CredentialsPanel({
  credentials,
  onSaved,
}: {
  credentials: OnboardingState["credentials"];
  onSaved?: () => void;
}) {
  const [replacing, setReplacing] = useState(false);

  if (!credentials || replacing) {
    return (
      <PluggyCredentialsForm
        onSaved={() => {
          setReplacing(false);
          onSaved?.();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          className="mt-0.5 size-5 shrink-0 text-success"
          strokeWidth={2}
        />
        <div>
          <p className="text-sm font-medium">Credenciais configuradas</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Client ID{" "}
            <span className="font-mono text-xs">
              {credentials.clientIdHint}
            </span>{" "}
            · salvas nesta instância
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => setReplacing(true)}>
        Substituir
      </Button>
    </div>
  );
}
