"use client";

import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useActionState, useState } from "react";

import { type AuthFormState, login, signup } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const idle: AuthFormState = { status: "idle" };

function AuthField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          className="text-xs text-destructive-foreground"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PasswordInput({
  id,
  name,
  autoComplete,
  invalid,
}: {
  id: string;
  name: string;
  autoComplete: "new-password" | "current-password";
  invalid?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={revealed ? "text" : "password"}
        autoComplete={autoComplete}
        required
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className="h-11 pr-11 md:h-10"
      />
      <button
        type="button"
        onClick={() => setRevealed((value) => !value)}
        aria-label={revealed ? "Ocultar senha" : "Mostrar senha"}
        className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <HugeiconsIcon
          icon={revealed ? ViewOffSlashIcon : ViewIcon}
          className="size-4"
          strokeWidth={1.8}
        />
      </button>
    </div>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-2.5 text-sm text-destructive-foreground"
    >
      {message}
    </p>
  );
}

const fieldClassName = "h-11 md:h-10";

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, idle);
  const errors = state.errors ?? {};
  // Remount the inputs with the echoed values after a failed submit,
  // because React resets uncontrolled forms when an action finishes.
  const formKey = JSON.stringify(state.values ?? {});

  return (
    <form action={action} className="space-y-4" noValidate key={formKey}>
      <div className="grid grid-cols-2 gap-3">
        <AuthField label="Nome" htmlFor="firstName" error={errors.firstName}>
          <Input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            required
            autoFocus
            defaultValue={state.values?.firstName}
            aria-invalid={errors.firstName ? true : undefined}
            className={fieldClassName}
          />
        </AuthField>
        <AuthField label="Sobrenome" htmlFor="lastName" error={errors.lastName}>
          <Input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            required
            defaultValue={state.values?.lastName}
            aria-invalid={errors.lastName ? true : undefined}
            className={fieldClassName}
          />
        </AuthField>
      </div>
      <AuthField label="E-mail" htmlFor="email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.values?.email}
          aria-invalid={errors.email ? true : undefined}
          className={fieldClassName}
        />
      </AuthField>
      <AuthField label="Senha" htmlFor="password" error={errors.password}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          invalid={Boolean(errors.password)}
        />
      </AuthField>
      <AuthField
        label="Confirme a senha"
        htmlFor="confirmPassword"
        error={errors.confirmPassword}
      >
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          invalid={Boolean(errors.confirmPassword)}
        />
      </AuthField>
      <p className="text-xs leading-5 text-muted-foreground">
        Pelo menos 8 caracteres, com letras e números.
      </p>
      <FormError message={state.message} />
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className={cn("h-11 w-full md:h-10")}
      >
        {pending ? "Criando sua conta…" : "Criar conta"}
      </Button>
    </form>
  );
}

export function LoginForm({ autoFocus = true }: { autoFocus?: boolean }) {
  const [state, action, pending] = useActionState(login, idle);
  const errors = state.errors ?? {};

  return (
    <form
      action={action}
      className="space-y-4"
      noValidate
      key={state.values?.email ?? ""}
    >
      <AuthField label="E-mail" htmlFor="email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus={autoFocus && !state.values?.email}
          defaultValue={state.values?.email}
          aria-invalid={errors.email ? true : undefined}
          className={fieldClassName}
        />
      </AuthField>
      <AuthField label="Senha" htmlFor="password" error={errors.password}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          invalid={Boolean(errors.password)}
        />
      </AuthField>
      <FormError message={state.message} />
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-11 w-full md:h-10"
      >
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
