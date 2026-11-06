import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { getFinancialPlan } from "@/actions/financial-plan";
import { createGoal } from "@/actions/goals";
import {
  createHouseholdMember,
  deleteHouseholdMember,
  deleteObligation,
  saveFinancialProfile,
  saveObligation,
} from "@/actions/household";
import { Tito } from "@/components/mascot/tito";
import { ScenarioChart } from "@/components/plan/scenario-chart";
import { Button, buttonVariants } from "@/components/ui/button";
import { Notice, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { selectTriggerVariants } from "@/components/ui/select-variants";
import type { FinancialPlan } from "@/lib/financial-plan";
import type { FinancialProfileView } from "@/lib/financial-profile";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Meu plano" };

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const formatCurrency = (value: number) => currency.format(value);

function formatMonth(key: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${key}-15T12:00:00Z`));
}

function formatShortMonth(key: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "short",
  }).format(new Date(`${key}-15T12:00:00Z`));
}

function formatDuration(months: number) {
  if (months < 12) return `${months} meses`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} anos e ${rest} meses` : `${years} anos`;
}

function askTito(question: string) {
  return `/assistant?q=${encodeURIComponent(question)}`;
}

const obligationKindLabels: Record<string, string> = {
  financing: "Financiamento",
  loan: "Empréstimo",
  rent: "Aluguel",
  education: "Escola / faculdade",
  alimony: "Pensão",
  other: "Outro",
};

const goalLabels: Record<string, string> = {
  independence: "Independência financeira",
  home: "Comprar ou quitar a casa",
  "debt-free": "Sair das dívidas",
  education: "Estudo dos filhos",
  travel: "Uma grande viagem",
};

const fieldClass = "space-y-1 text-xs text-muted-foreground";
const selectClass = cn(selectTriggerVariants(), "appearance-auto");

function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4 md:px-6">
        <div>
          <h2 className="text-base font-medium">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="min-w-0 p-4 sm:p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-xl font-normal tracking-[-0.03em] whitespace-nowrap tabular-nums sm:text-2xl",
          tone === "positive" && "text-success-foreground",
          tone === "negative" && "text-destructive-foreground",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function StepList({ plan }: { plan: FinancialPlan }) {
  return (
    <ol className="stagger divide-y">
      {plan.steps.map((step, index) => (
        <li key={step.key} className="flex gap-4 px-5 py-4 md:px-6">
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
              step.tone === "warning" &&
                "bg-warning/15 text-warning-foreground",
              step.tone === "info" && "bg-primary/10 text-primary",
              step.tone === "success" &&
                "bg-success/15 text-success-foreground",
            )}
          >
            {step.tone === "success" ? "✓" : index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">{step.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {step.detail}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ProfileForm({ profile }: { profile: FinancialProfileView }) {
  return (
    <form
      action={saveFinancialProfile}
      className="grid gap-4 px-5 py-5 sm:grid-cols-2 md:px-6"
    >
      <label htmlFor="p-household" className={fieldClass}>
        Quem vive desta renda
        <select
          id="p-household"
          name="householdType"
          defaultValue={profile.householdType}
          className={selectClass}
        >
          <option value="single">Só eu</option>
          <option value="couple">Casal</option>
          <option value="family">Família com filhos</option>
        </select>
      </label>
      <label htmlFor="p-earners" className={fieldClass}>
        Quantas pessoas trazem renda
        <Input
          id="p-earners"
          name="incomeEarners"
          type="number"
          min={1}
          max={6}
          defaultValue={profile.incomeEarners}
        />
      </label>
      <label htmlFor="p-dependents" className={fieldClass}>
        Dependentes (filhos, pais…)
        <Input
          id="p-dependents"
          name="dependents"
          type="number"
          min={0}
          max={10}
          defaultValue={profile.dependents}
        />
      </label>
      <label htmlFor="p-stability" className={fieldClass}>
        Como é a renda
        <select
          id="p-stability"
          name="incomeStability"
          defaultValue={profile.incomeStability}
          className={selectClass}
        >
          <option value="stable">Estável (CLT, servidor)</option>
          <option value="variable">Variável (autônomo, comissão)</option>
        </select>
      </label>
      <label htmlFor="p-birth" className={fieldClass}>
        Ano em que você nasceu
        <Input
          id="p-birth"
          name="birthYear"
          type="number"
          placeholder="1990"
          defaultValue={profile.birthYear ?? ""}
        />
      </label>
      <label htmlFor="p-goal" className={fieldClass}>
        Objetivo principal
        <select
          id="p-goal"
          name="mainGoal"
          defaultValue={profile.mainGoal}
          className={selectClass}
        >
          {Object.entries(goalLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="p-age" className={fieldClass}>
        Com que idade quer ser independente (opcional)
        <Input
          id="p-age"
          name="targetIndependenceAge"
          type="number"
          placeholder="55"
          defaultValue={profile.targetIndependenceAge ?? ""}
        />
      </label>
      <label htmlFor="p-cost" className={fieldClass}>
        Custo de vida desejado por mês (opcional)
        <Input
          id="p-cost"
          name="desiredMonthlyCost"
          inputMode="decimal"
          placeholder="Usar o gasto de hoje"
          defaultValue={profile.desiredMonthlyCost ?? ""}
        />
      </label>
      <details className="sm:col-span-2">
        <summary className="cursor-pointer list-none text-xs text-muted-foreground hover:text-foreground">
          Premissas avançadas
        </summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <label htmlFor="p-return" className={fieldClass}>
            Retorno acima da inflação (% a.a.)
            <Input
              id="p-return"
              name="expectedRealReturn"
              inputMode="decimal"
              defaultValue={profile.expectedRealReturn}
            />
          </label>
          <label htmlFor="p-withdraw" className={fieldClass}>
            Retirada anual na independência (%)
            <Input
              id="p-withdraw"
              name="withdrawalRate"
              inputMode="decimal"
              defaultValue={profile.withdrawalRate}
            />
          </label>
          <label htmlFor="p-emergency" className={fieldClass}>
            Meses de reserva (vazio: o Tito sugere)
            <Input
              id="p-emergency"
              name="emergencyMonths"
              type="number"
              defaultValue={profile.emergencyMonths ?? ""}
            />
          </label>
        </div>
      </details>
      <label htmlFor="p-notes" className={cn(fieldClass, "sm:col-span-2")}>
        Algo que o Tito precisa saber (opcional)
        <textarea
          id="p-notes"
          name="notes"
          rows={2}
          maxLength={600}
          defaultValue={profile.notes ?? ""}
          placeholder="Ex.: queremos ter um filho em 2028; a Ana vai fazer mestrado no ano que vem"
          className="w-full resize-none rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 dark:bg-input/30"
        />
      </label>
      <div className="sm:col-span-2">
        <Button type="submit">Salvar e recalcular o plano</Button>
      </div>
    </form>
  );
}

function ObligationForm() {
  return (
    <form
      action={saveObligation}
      className="grid gap-3 px-5 py-4 sm:grid-cols-3 md:px-6"
    >
      <label htmlFor="o-name" className={cn(fieldClass, "sm:col-span-2")}>
        Nome
        <Input
          id="o-name"
          name="name"
          required
          maxLength={60}
          placeholder="Financiamento do apartamento"
        />
      </label>
      <label htmlFor="o-kind" className={fieldClass}>
        Tipo
        <select id="o-kind" name="kind" className={selectClass}>
          {Object.entries(obligationKindLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="o-amount" className={fieldClass}>
        Parcela por mês
        <Input
          id="o-amount"
          name="monthlyAmount"
          inputMode="decimal"
          required
          placeholder="3.000,00"
        />
      </label>
      <label htmlFor="o-end" className={fieldClass}>
        Última parcela (opcional)
        <Input id="o-end" name="endMonth" type="month" />
      </label>
      <label htmlFor="o-rate" className={fieldClass}>
        Juros ao ano % (opcional)
        <Input
          id="o-rate"
          name="interestRate"
          inputMode="decimal"
          placeholder="10,5"
        />
      </label>
      <label htmlFor="o-balance" className={fieldClass}>
        Saldo devedor (opcional)
        <Input
          id="o-balance"
          name="balance"
          inputMode="decimal"
          placeholder="220.000,00"
        />
      </label>
      <div className="flex items-end sm:col-span-2">
        <Button type="submit">Adicionar compromisso</Button>
      </div>
    </form>
  );
}

export default async function FinancialPlanPage() {
  const result = await getFinancialPlan();
  const { baseline, plan, profile } = result;
  const independence = plan.independence;
  const best = independence.scenarios.at(-1);
  const maxMonth = Math.max(
    1,
    ...baseline.months.map((month) => Math.max(month.income, month.expenses)),
  );

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/planning" className="hover:text-foreground">
            ← Planejar
          </Link>
        }
        title="Meu plano"
        description="O caminho para o seu objetivo a partir do que a sua casa vive de verdade: renda, gastos, compromissos e quem depende de quem."
        actions={
          <Link
            href={askTito(
              "Olhe o meu plano financeiro e me diga, com os meus números, o que eu deveria fazer nos próximos 3 meses.",
            )}
            className={buttonVariants({ size: "sm" })}
          >
            Conversar com o Tito
          </Link>
        }
      />

      {result.error ? <Notice tone="warning">{result.error}</Notice> : null}
      {plan.warnings.map((warning) => (
        <Notice key={warning} tone="info">
          {warning}
        </Notice>
      ))}

      {!profile.saved ? (
        <section className="surface overflow-hidden animate-rise-in">
          <div className="flex items-center gap-4 border-b px-5 py-5 md:px-6">
            <Tito mood="wave" size="lg" />
            <div>
              <p className="font-medium">Me conta um pouco sobre a sua casa</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Quem é solteiro guarda de um jeito; um casal com financiamento,
                de outro. Com isso o plano fica do seu tamanho — nada de metas
                de internet.
              </p>
            </div>
          </div>
          <ProfileForm profile={profile} />
        </section>
      ) : null}

      <Section
        title="Raio-X da casa"
        description={`Mês típico dos últimos ${baseline.monthsAnalyzed} meses fechados${baseline.members.length > 1 ? `, somando ${baseline.members.length} pessoas` : ""}. Transferências entre vocês não contam como gasto.`}
      >
        <div className="grid grid-cols-2 divide-border xl:grid-cols-4 max-xl:[&>div:nth-child(-n+2)]:border-b xl:[&>div:not(:first-child)]:border-l max-xl:[&>div:nth-child(even)]:border-l">
          <Stat
            label="Renda típica"
            value={formatCurrency(baseline.typicalIncome)}
          />
          <Stat
            label="Gasto típico"
            value={formatCurrency(baseline.typicalExpenses)}
            hint={`${formatCurrency(baseline.typicalEssential)} essenciais`}
          />
          <Stat
            label="Sobra por mês"
            value={formatCurrency(baseline.savingsCapacity)}
            tone={baseline.savingsCapacity >= 0 ? "positive" : "negative"}
          />
          <Stat
            label="Taxa de poupança"
            value={`${Math.round(baseline.savingsRate * 100)}%`}
            hint={
              result.obligations.length
                ? `${formatCurrency(plan.obligations.totalMonthly)}/mês em compromissos`
                : undefined
            }
          />
        </div>

        {baseline.months.length > 0 ? (
          <div className="border-t px-5 py-4 md:px-6">
            <div className="flex h-28 items-end gap-3">
              {baseline.months.map((month) => (
                <div
                  key={month.key}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div className="flex h-24 w-full items-end justify-center gap-1">
                    <span
                      className="w-1/3 rounded-t bg-success/70"
                      style={{ height: `${(month.income / maxMonth) * 100}%` }}
                      title={`Entrou ${formatCurrency(month.income)}`}
                    />
                    <span
                      className="w-1/3 rounded-t bg-destructive/60"
                      style={{
                        height: `${(month.expenses / maxMonth) * 100}%`,
                      }}
                      title={`Saiu ${formatCurrency(month.expenses)}`}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {formatShortMonth(month.key)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="text-success-foreground">■</span> entrou ·{" "}
              <span className="text-destructive-foreground">■</span> saiu
            </p>
          </div>
        ) : null}

        {baseline.members.length > 1 ? (
          <ul className="divide-y border-t">
            {baseline.members.map((member) => (
              <li
                key={member.memberId ?? "none"}
                className="flex items-center justify-between gap-3 px-5 py-3 text-sm md:px-6"
              >
                <span
                  className={member.memberId ? "" : "text-muted-foreground"}
                >
                  {member.name}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  traz {formatCurrency(member.typicalIncome)} · gasta{" "}
                  {formatCurrency(member.typicalExpenses)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {result.ownershipIncomplete || result.members.length === 0 ? (
          <p className="border-t px-5 py-3 text-xs text-muted-foreground md:px-6">
            {result.members.length === 0
              ? "Conectou as contas de mais alguém da casa? Cadastre as pessoas abaixo e diga de quem é cada banco em "
              : "Tem banco sem dono definido. Diga de quem é cada um em "}
            <Link href="/accounts" className="underline underline-offset-2">
              Conexões
            </Link>
            .
          </p>
        ) : null}
      </Section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Section
          title="Seu plano, passo a passo"
          description="Na ordem que faz sentido para a sua situação."
        >
          <StepList plan={plan} />
        </Section>

        <Section
          title={goalLabels.independence}
          description={`${formatCurrency(independence.target)} investidos pagam ${formatCurrency(independence.monthlyCost)} por mês, para sempre, retirando ${profile.withdrawalRate}% ao ano.`}
        >
          <div className="space-y-4 px-5 py-4 md:px-6">
            <div className="space-y-1.5">
              <p className="text-sm tabular-nums">
                {formatCurrency(independence.invested)}
                <span className="text-muted-foreground">
                  {" "}
                  investidos · {Math.round(independence.progress * 100)}% do
                  caminho
                </span>
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.max(2, independence.progress * 100)}%`,
                  }}
                />
              </div>
            </div>

            <ScenarioChart
              scenarios={independence.scenarios}
              target={independence.target}
            />

            <ul className="space-y-2 text-sm">
              {independence.scenarios.map((scenario) => (
                <li key={scenario.key} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    {scenario.label}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {scenario.monthsToGoal === null
                      ? "mais de 50 anos"
                      : scenario.reachMonth
                        ? `${formatDuration(scenario.monthsToGoal)}${scenario.reachAge ? ` · aos ${scenario.reachAge}` : ""}`
                        : "já chegou"}
                  </span>
                </li>
              ))}
            </ul>

            {independence.requiredMonthly !== null && independence.targetAge ? (
              <p
                className={cn(
                  "rounded-xl px-3 py-2.5 text-sm",
                  independence.status === "on-track" &&
                    "bg-success/10 text-success-foreground",
                  independence.status === "tight" &&
                    "bg-warning/15 text-warning-foreground",
                  independence.status === "far" &&
                    "bg-destructive/10 text-destructive-foreground",
                )}
              >
                Para chegar lá aos {independence.targetAge}, seria preciso
                investir {formatCurrency(independence.requiredMonthly)} por mês.
                Hoje sobram {formatCurrency(plan.capacity)}.{" "}
                {independence.status === "on-track"
                  ? "Dá: é manter o ritmo."
                  : independence.status === "tight"
                    ? "Fica apertado, mas com os ajustes e o dinheiro dos compromissos que acabam, dá para chegar perto."
                    : `Com a vida de hoje, é irrealista${best?.reachAge ? ` — mais perto dos ${best.reachAge}` : ""}. Melhor ajustar a idade ou o custo de vida desejado do que se frustrar.`}
              </p>
            ) : null}

            <p className="text-xs leading-5 text-muted-foreground">
              Projeção em reais de hoje, com {profile.expectedRealReturn}% ao
              ano acima da inflação. É uma estimativa para orientar, não
              promessa de rentabilidade nem recomendação de investimento.
            </p>
          </div>
        </Section>
      </div>

      {plan.goalSuggestions.length > 0 ? (
        <Section
          title="Metas sugeridas"
          description="Do tamanho do seu plano. Crie com um clique e acompanhe em Planejar."
        >
          <ul className="divide-y">
            {plan.goalSuggestions.map((goal) => (
              <li
                key={goal.key}
                className="flex items-center justify-between gap-3 px-5 py-4 md:px-6"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    <span aria-hidden="true">{goal.emoji} </span>
                    {goal.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(goal.targetAmount)}
                    {goal.targetDate
                      ? ` até ${formatMonth(goal.targetDate)}`
                      : ""}
                    {goal.savedAmount > 0
                      ? ` · já começa com ${formatCurrency(goal.savedAmount)}`
                      : ""}
                  </p>
                </div>
                <form action={createGoal}>
                  <input type="hidden" name="name" value={goal.name} />
                  <input type="hidden" name="emoji" value={goal.emoji} />
                  <input
                    type="hidden"
                    name="targetAmount"
                    value={goal.targetAmount}
                  />
                  <input
                    type="hidden"
                    name="savedAmount"
                    value={goal.savedAmount}
                  />
                  <input
                    type="hidden"
                    name="targetDate"
                    value={goal.targetDate ?? ""}
                  />
                  <Button type="submit" size="sm" variant="outline">
                    Criar meta
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section
        title="Compromissos fixos"
        description="Financiamentos, aluguel, escola: o que já tem dono todo mês. Com a data da última parcela, o plano sabe quando esse dinheiro volta."
      >
        {result.obligations.length > 0 ? (
          <ul className="divide-y">
            {result.obligations.map((obligation) => {
              const hint = plan.obligations.hints.find(
                (item) => item.id === obligation.id,
              );
              return (
                <li key={obligation.id} className="space-y-1 px-5 py-3 md:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 text-sm">
                      <span className="font-medium">{obligation.name}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {obligationKindLabels[obligation.kind] ?? "Outro"}
                        {obligation.endMonth
                          ? ` · até ${formatMonth(obligation.endMonth)}`
                          : ""}
                      </span>
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm tabular-nums">
                        {formatCurrency(obligation.monthlyAmount)}/mês
                      </span>
                      <form action={deleteObligation}>
                        <input
                          type="hidden"
                          name="obligationId"
                          value={obligation.id}
                        />
                        <Button type="submit" size="sm" variant="ghost">
                          Remover
                        </Button>
                      </form>
                    </div>
                  </div>
                  {hint ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      {hint.text}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        {result.candidates.length > 0 ? (
          <div className="border-t">
            <p className="flex items-center gap-2 px-5 pt-4 text-xs text-muted-foreground md:px-6">
              <Tito mood="idle" size="xs" animated={false} />
              Encontrei cobranças que parecem compromissos
            </p>
            <ul className="divide-y">
              {result.candidates.map((candidate) => (
                <li
                  key={candidate.name}
                  className="flex items-center justify-between gap-3 px-5 py-3 md:px-6"
                >
                  <p className="min-w-0 text-sm">
                    {candidate.name}
                    <span className="block text-xs text-muted-foreground">
                      {formatCurrency(candidate.monthlyAmount)} por mês
                    </span>
                  </p>
                  <form action={saveObligation}>
                    <input type="hidden" name="name" value={candidate.name} />
                    <input type="hidden" name="kind" value={candidate.kind} />
                    <input
                      type="hidden"
                      name="monthlyAmount"
                      value={candidate.monthlyAmount}
                    />
                    <Button type="submit" size="sm" variant="outline">
                      Adicionar
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <details className="border-t" open={result.obligations.length === 0}>
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium md:px-6">
            + Novo compromisso
          </summary>
          <ObligationForm />
        </details>
      </Section>

      <Section
        title="Sua casa"
        description="Quem faz parte e o contexto que muda o plano."
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-5 py-4 md:px-6">
          {result.members.map((member) => (
            <form
              key={member.id}
              action={deleteHouseholdMember}
              className="inline-flex items-center gap-1 rounded-full border py-1 pr-1 pl-3 text-sm"
            >
              {member.name}
              <input type="hidden" name="memberId" value={member.id} />
              <button
                type="submit"
                aria-label={`Remover ${member.name}`}
                className="rounded-full px-1.5 text-muted-foreground hover:text-destructive-foreground"
              >
                ×
              </button>
            </form>
          ))}
          <form
            action={createHouseholdMember}
            className="flex items-center gap-2"
          >
            <Input
              name="name"
              required
              maxLength={40}
              placeholder="Nome de quem mais tem conta aqui"
              aria-label="Nome da pessoa"
              className="h-8 w-56"
            />
            <Button type="submit" size="sm" variant="outline">
              Adicionar pessoa
            </Button>
          </form>
        </div>
        {profile.saved ? (
          <details>
            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium md:px-6">
              Editar o perfil da casa
            </summary>
            <ProfileForm profile={profile} />
          </details>
        ) : (
          <p className="px-5 py-4 text-sm text-muted-foreground md:px-6">
            Preencha o perfil lá em cima para o plano levar a sua realidade em
            conta.
          </p>
        )}
      </Section>
    </>
  );
}
