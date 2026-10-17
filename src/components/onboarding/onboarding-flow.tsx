"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BankIcon,
  CheckmarkCircle02Icon,
  Key01Icon,
  LinkSquare02Icon,
  MoreHorizontalIcon,
  Plug01Icon,
  Shield01Icon,
  SourceCodeIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type ReactNode, useState } from "react";

import { completeOnboarding, type OnboardingState } from "@/actions/onboarding";
import { DeployOnHangarButton } from "@/components/brand";
import {
  ConnectionList,
  CredentialsPanel,
  PluggyConnectionForm,
} from "@/components/onboarding/pluggy-forms";
import { Button, buttonVariants } from "@/components/ui/button";
import { type OnboardingStepId, onboardingSteps } from "@/lib/onboarding";
import {
  GITHUB_REPO_URL,
  MEU_PLUGGY_GUIDE_URL,
  MEU_PLUGGY_URL,
  PLUGGY_DASHBOARD_URL,
} from "@/lib/project";
import { cn } from "@/lib/utils";

function ExternalLink({
  href,
  children,
  variant = "outline",
}: {
  href: string;
  children: ReactNode;
  variant?: "outline" | "default" | "ink";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={buttonVariants({ variant })}
    >
      {children}
      <HugeiconsIcon
        icon={LinkSquare02Icon}
        className="size-3.5 opacity-70"
        strokeWidth={2}
      />
    </a>
  );
}

function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-foreground underline decoration-foreground/25 underline-offset-[3px] transition-colors hover:decoration-foreground"
    >
      {children}
    </a>
  );
}

function Instructions({ children }: { children: ReactNode }) {
  return (
    <ol className="relative space-y-4 [counter-reset:step]">{children}</ol>
  );
}

function Instruction({
  title,
  children,
}: {
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className="relative flex gap-3.5 [counter-increment:step] before:flex before:size-6 before:shrink-0 before:items-center before:justify-center before:rounded-full before:bg-foreground/[0.07] before:text-xs before:font-medium before:text-foreground before:tabular-nums before:content-[counter(step)]">
      <div className="min-w-0 pt-0.5">
        <p className="text-sm leading-5 font-medium">{title}</p>
        {children ? (
          <div className="mt-1 text-sm leading-6 text-muted-foreground">
            {children}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center rounded-md border bg-card px-1.5 text-xs font-medium text-foreground shadow-[0_1px_0_rgb(0_0_0/0.04)]">
      {children}
    </span>
  );
}

function StepHeader({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: typeof BankIcon;
  eyebrow: string;
  title: string;
  description: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={icon} className="size-3.5" strokeWidth={2} />
        </span>
        {eyebrow}
      </div>
      <h1 className="mt-4 text-[1.625rem] leading-tight font-normal tracking-[-0.03em] md:text-[1.875rem]">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

/** A tiny replica of the Pluggy Demo menu, so the user knows what to click. */
function CopyItemIdPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden rounded-xl border bg-muted p-4"
    >
      <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#ef3e5c] text-[10px] font-medium text-white">
            MP
          </span>
          <div>
            <p className="text-xs font-medium">MeuPluggy</p>
            <p className="text-[11px] text-success-foreground">● Conectado</p>
          </div>
        </div>
        <span className="flex size-6 items-center justify-center rounded-md bg-foreground/[0.07]">
          <HugeiconsIcon
            icon={MoreHorizontalIcon}
            className="size-4"
            strokeWidth={2}
          />
        </span>
      </div>
      <div className="mt-1.5 ml-auto w-44 rounded-lg border bg-popover p-1 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.2)]">
        <p className="rounded-md px-2 py-1.5 text-xs text-muted-foreground">
          Atualizar
        </p>
        <p className="flex items-center justify-between rounded-md bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary">
          Copiar Item ID
          <span className="text-[10px]">← este</span>
        </p>
        <p className="rounded-md px-2 py-1.5 text-xs text-muted-foreground">
          Excluir
        </p>
      </div>
    </div>
  );
}

function StepRail({
  current,
  completed,
  onSelect,
}: {
  current: OnboardingStepId;
  completed: Set<OnboardingStepId>;
  onSelect: (step: OnboardingStepId) => void;
}) {
  const currentIndex = onboardingSteps.findIndex((s) => s.id === current);

  return (
    <nav aria-label="Etapas da configuração">
      {/* Phone: a compact progress bar. */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Etapa {currentIndex + 1} de {onboardingSteps.length}
          </span>
          <span>{onboardingSteps[currentIndex]?.label}</span>
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1">
          {onboardingSteps.map((step, index) => (
            <span
              key={step.id}
              className={cn(
                "h-1 rounded-full transition-colors",
                index <= currentIndex ? "bg-primary" : "bg-foreground/10",
              )}
            />
          ))}
        </div>
      </div>

      {/* Desktop: the full list, each step reachable once unlocked. */}
      <ol className="hidden space-y-1 lg:block">
        {onboardingSteps.map((step, index) => {
          const isCurrent = step.id === current;
          const isDone = completed.has(step.id) && !isCurrent;
          const reachable = index <= currentIndex || completed.has(step.id);

          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!reachable}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => onSelect(step.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
                  isCurrent
                    ? "bg-card font-medium text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.05),0_0_0_1px_var(--border)]"
                    : reachable
                      ? "cursor-pointer text-muted-foreground hover:bg-accent hover:text-foreground"
                      : "cursor-default text-muted-foreground/60",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] tabular-nums transition-colors",
                    isDone
                      ? "bg-success text-white"
                      : isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-foreground/[0.07] text-muted-foreground",
                  )}
                >
                  {isDone ? (
                    <HugeiconsIcon
                      icon={Tick01Icon}
                      className="size-3"
                      strokeWidth={2.5}
                    />
                  ) : (
                    index + 1
                  )}
                </span>
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepFooter({
  onBack,
  children,
}: {
  onBack?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
      {onBack ? (
        <Button
          variant="ghost"
          onClick={onBack}
          className="self-start sm:-ml-2"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          Voltar
        </Button>
      ) : (
        <span className="hidden sm:block" />
      )}
      {/* Phones get full-width, thumb-sized actions with the primary one on top. */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center max-sm:[&>*]:h-11 max-sm:[&>*]:w-full">
        {children}
      </div>
    </div>
  );
}

export function OnboardingFlow({
  state,
  initialStep,
}: {
  state: OnboardingState;
  initialStep: OnboardingStepId;
}) {
  const [step, setStep] = useState<OnboardingStepId>(initialStep);

  const completed = new Set<OnboardingStepId>();
  if (step !== "welcome") completed.add("welcome");
  if (state.credentials) {
    completed.add("welcome");
    completed.add("meu-pluggy");
    completed.add("credentials");
  }
  if (state.connections.length > 0) completed.add("connect");

  const goTo = (next: OnboardingStepId) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <StepRail current={step} completed={completed} onSelect={goTo} />
      </aside>

      <section className="surface p-6 md:p-8" aria-live="polite">
        {step === "welcome" ? (
          <>
            <StepHeader
              icon={Shield01Icon}
              eyebrow="Configuração · ~10 minutos"
              title="Suas finanças, no seu servidor."
              description="O Worthly lê contas, cartões e investimentos dos seus bancos via Open Finance, usando o Meu Pluggy. Você configura uma vez e o painel se atualiza sozinho."
            />
            <ul className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: Shield01Icon,
                  title: "Somente leitura",
                  text: "Nada é movimentado. O app só consulta saldos e lançamentos.",
                },
                {
                  icon: Key01Icon,
                  title: "Chaves com você",
                  text: "Credenciais ficam no servidor da sua instância, não no navegador.",
                },
                {
                  icon: SourceCodeIcon,
                  title: "Open source",
                  text: "Código aberto. Audite, adapte e hospede onde quiser.",
                },
              ].map((item) => (
                <li key={item.title} className="rounded-xl bg-muted p-4">
                  <HugeiconsIcon
                    icon={item.icon}
                    className="size-4 text-muted-foreground"
                    strokeWidth={1.8}
                  />
                  <p className="mt-3 text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {item.text}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-7 rounded-xl border border-dashed p-4 text-sm leading-6 text-muted-foreground">
              Você vai precisar de: uma conta no{" "}
              <InlineLink href={MEU_PLUGGY_URL}>Meu Pluggy</InlineLink>{" "}
              (gratuita) e uma conta de desenvolvedor no{" "}
              <InlineLink href={PLUGGY_DASHBOARD_URL}>
                dashboard da Pluggy
              </InlineLink>
              . Vamos criar as duas juntos.
            </div>
            <StepFooter>
              <Button size="lg" onClick={() => goTo("meu-pluggy")}>
                Começar configuração
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              </Button>
            </StepFooter>
          </>
        ) : null}

        {step === "meu-pluggy" ? (
          <>
            <StepHeader
              icon={BankIcon}
              eyebrow="Etapa 1 · Meu Pluggy"
              title="Conecte seus bancos no Meu Pluggy"
              description="O Meu Pluggy é o app gratuito da Pluggy para pessoas físicas. Ele guarda suas conexões do Open Finance e as atualiza todos os dias."
            />
            <div className="mt-7">
              <Instructions>
                <Instruction title="Crie sua conta gratuita">
                  Acesse{" "}
                  <InlineLink href={MEU_PLUGGY_URL}>meu.pluggy.ai</InlineLink> e
                  cadastre-se com seu e-mail.
                </Instruction>
                <Instruction title="Conecte um banco">
                  Clique em <Kbd>Conectar conta</Kbd>, procure sua instituição e
                  autorize o compartilhamento pelo app do próprio banco (Open
                  Finance).
                </Instruction>
                <Instruction title="Repita para cada banco">
                  Adicione todos os bancos e cartões que quer acompanhar aqui —
                  conta corrente, cartão de crédito e investimentos.
                </Instruction>
              </Instructions>
            </div>
            <StepFooter onBack={() => goTo("welcome")}>
              <ExternalLink href={MEU_PLUGGY_URL}>
                Abrir Meu Pluggy
              </ExternalLink>
              <Button onClick={() => goTo("credentials")}>
                Já conectei
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              </Button>
            </StepFooter>
          </>
        ) : null}

        {step === "credentials" ? (
          <>
            <StepHeader
              icon={Key01Icon}
              eyebrow="Etapa 2 · Dashboard da Pluggy"
              title="Crie sua aplicação e copie as chaves"
              description="É por essa aplicação que o Worthly lê os dados que você autorizou no Meu Pluggy."
            />
            <div className="mt-7">
              <Instructions>
                <Instruction title="Crie uma conta de desenvolvedor">
                  Cadastre-se em{" "}
                  <InlineLink href={PLUGGY_DASHBOARD_URL}>
                    dashboard.pluggy.ai
                  </InlineLink>
                  . O cadastro abre um período de teste de 15 dias — conclua
                  esta configuração dentro dele.
                </Instruction>
                <Instruction title="Adicione o conector MeuPluggy">
                  Personalize a lista de conectores do dashboard e inclua o{" "}
                  <Kbd>MeuPluggy</Kbd>.
                </Instruction>
                <Instruction title="Crie uma aplicação de desenvolvimento">
                  Em <Kbd>Aplicações</Kbd>, crie uma aplicação do tipo{" "}
                  <Kbd>Development</Kbd>.
                </Instruction>
                <Instruction title="Copie o Client ID e o Client Secret">
                  Eles aparecem na página da aplicação. Cole os dois abaixo — o
                  Worthly valida com a Pluggy antes de salvar.
                </Instruction>
              </Instructions>
            </div>

            <div className="mt-7 rounded-xl border bg-muted p-4 md:p-5">
              <CredentialsPanel
                credentials={state.credentials}
                onSaved={() => goTo("connect")}
              />
            </div>

            <StepFooter onBack={() => goTo("meu-pluggy")}>
              <ExternalLink href={PLUGGY_DASHBOARD_URL}>
                Abrir dashboard
              </ExternalLink>
              {state.credentials ? (
                <Button onClick={() => goTo("connect")}>
                  Continuar
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                </Button>
              ) : null}
            </StepFooter>
          </>
        ) : null}

        {step === "connect" ? (
          <>
            <StepHeader
              icon={Plug01Icon}
              eyebrow="Etapa 3 · Demo da Pluggy"
              title="Autorize o MeuPluggy e cole o Item ID"
              description="Cada banco autorizado vira um Item ID. É ele que diz ao Worthly quais dados importar."
            />
            <div className="mt-7 grid gap-6 md:grid-cols-[minmax(0,1fr)_15rem]">
              <Instructions>
                <Instruction title="Abra a Demo da sua aplicação">
                  No dashboard, entre na aplicação que você criou e clique em{" "}
                  <Kbd>Ir para Demo</Kbd>.
                </Instruction>
                <Instruction title="Conecte o MeuPluggy">
                  Escolha o conector <Kbd>MeuPluggy</Kbd>, entre com a sua conta
                  do Meu Pluggy e selecione o banco.
                </Instruction>
                <Instruction title="Copie o Item ID">
                  No menu <Kbd>⋯</Kbd> do canto superior direito, clique em{" "}
                  <Kbd>Copiar Item ID</Kbd> e cole aqui.
                </Instruction>
                <Instruction title="Um Item ID por banco">
                  Repita para cada banco do Meu Pluggy — um por banco, não por
                  conta.
                </Instruction>
              </Instructions>
              <CopyItemIdPreview />
            </div>

            <div className="mt-7 space-y-4 rounded-xl border bg-muted p-4 md:p-5">
              {state.credentials ? (
                <PluggyConnectionForm />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Salve as credenciais da etapa anterior para adicionar
                  conexões.
                </p>
              )}
              <ConnectionList connections={state.connections} />
            </div>

            <StepFooter onBack={() => goTo("credentials")}>
              <Button
                disabled={state.connections.length === 0}
                onClick={() => goTo("done")}
              >
                {state.connections.length === 0
                  ? "Adicione um Item ID"
                  : "Importar meus dados"}
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              </Button>
            </StepFooter>
          </>
        ) : null}

        {step === "done" ? (
          <>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-success/12 text-success-foreground">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="size-6"
                strokeWidth={1.8}
              />
            </div>
            <h1 className="mt-5 text-[1.625rem] leading-tight font-normal tracking-[-0.03em] md:text-[1.875rem]">
              Tudo pronto.
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {state.connections.length}{" "}
              {state.connections.length === 1
                ? "conexão ativa"
                : "conexões ativas"}
              . Seus saldos, faturas e transações são lidos da Pluggy a cada
              visita ao painel — sem planilhas, sem importar arquivos.
            </p>
            <div className="mt-6">
              <ConnectionList connections={state.connections} />
            </div>
            <form action={completeOnboarding}>
              <StepFooter onBack={() => goTo("connect")}>
                <Button type="submit" size="lg">
                  Abrir meu painel
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                </Button>
              </StepFooter>
            </form>
            <div className="mt-6 flex flex-col gap-3 rounded-xl bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-muted-foreground">
                Curtiu? Ajude outras pessoas a ter o próprio organizador — dê
                uma estrela no{" "}
                <InlineLink href={GITHUB_REPO_URL}>GitHub</InlineLink> ou
                compartilhe o deploy em um clique.
              </p>
              <DeployOnHangarButton className="self-start sm:self-auto" />
            </div>
          </>
        ) : null}

        <p className="mt-8 text-xs text-muted-foreground">
          Travou em algum passo? O guia oficial do Meu Pluggy está em{" "}
          <InlineLink href={MEU_PLUGGY_GUIDE_URL}>
            github.com/pluggyai/meu-pluggy
          </InlineLink>
          .
        </p>
      </section>
    </div>
  );
}
