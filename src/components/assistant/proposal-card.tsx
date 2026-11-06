"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { applyProposal, dismissProposal } from "@/actions/goal-proposals";
import { Tito } from "@/components/mascot/tito";
import { Button } from "@/components/ui/button";
import type { ProposalView } from "@/lib/proposals";
import { cn } from "@/lib/utils";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function formatMonth(key: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "short",
    year: "2-digit",
  }).format(new Date(`${key}-15T12:00:00Z`));
}

function formatRange(from: string, to: string) {
  return from === to
    ? formatMonth(from)
    : `${formatMonth(from)} – ${formatMonth(to)}`;
}

/**
 * O cartão de uma proposta do Tito. Tudo o que aparece aqui veio do motor
 * de metas e foi guardado no servidor — o texto do modelo não entra.
 */
export function ProposalCard({
  proposal: initial,
}: {
  proposal: ProposalView;
}) {
  const [proposal, setProposal] = useState(initial);
  const [includeBudgets, setIncludeBudgets] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { schedule, payload } = proposal;
  const newGoals = schedule.outcomes.filter((outcome) => outcome.isNew);
  const existing = schedule.outcomes.filter((outcome) => !outcome.isNew);

  function run(action: () => ReturnType<typeof applyProposal>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) setProposal(result.proposal);
      else setError(result.message);
    });
  }

  if (proposal.status === "applied") {
    return (
      <div className="surface flex items-center gap-3 p-4 animate-pop-in">
        <Tito mood="celebrate" size="sm" />
        <div className="text-sm">
          <p className="font-medium">
            {payload.goals.length === 1
              ? "Meta criada!"
              : `${payload.goals.length} metas criadas!`}
          </p>
          <Link
            href="/planning"
            className="text-muted-foreground underline underline-offset-2"
          >
            Acompanhar em Planejar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "surface overflow-hidden text-sm animate-rise-in",
        proposal.status === "dismissed" && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <p className="font-medium">Plano de metas</p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px]",
            schedule.coversShortfall
              ? "bg-success/10 text-success-foreground"
              : "bg-warning/15 text-warning-foreground",
          )}
        >
          {schedule.feasible
            ? "Cabe na sobra de hoje"
            : schedule.coversShortfall
              ? "Cabe com as economias"
              : "Precisa ajustar datas"}
        </span>
      </div>

      <ul className="divide-y">
        {newGoals.map((outcome) => (
          <li
            key={outcome.key}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <span className="min-w-0">
              <span aria-hidden="true">{outcome.emoji} </span>
              <span className="font-medium">{outcome.name}</span>
              <span className="block text-xs text-muted-foreground">
                {currency.format(outcome.targetAmount)} até{" "}
                {formatMonth(outcome.targetMonth)}
              </span>
            </span>
            <span
              className={cn(
                "shrink-0 text-right text-xs",
                outcome.onTime
                  ? "text-success-foreground"
                  : "text-warning-foreground",
              )}
            >
              {outcome.completionMonth
                ? `${outcome.onTime ? "Pronta em" : "Só em"} ${formatMonth(outcome.completionMonth)}`
                : "Fora do horizonte"}
            </span>
          </li>
        ))}
      </ul>

      {existing.length > 0 ? (
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          Considerando também: {existing.map((goal) => goal.name).join(", ")}.
        </p>
      ) : null}

      {schedule.phases.length > 0 ? (
        <div className="space-y-1.5 border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">Mês a mês</p>
          {schedule.phases.slice(0, 6).map((phase) => (
            <p key={phase.from} className="flex justify-between gap-3 text-xs">
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {formatRange(phase.from, phase.to)}
              </span>
              <span className="text-right">
                {phase.allocations
                  .map((item) => `${item.name} ${currency.format(item.amount)}`)
                  .join(" · ")}
              </span>
            </p>
          ))}
          {schedule.emergency.untilMonth ? (
            <p className="text-xs text-muted-foreground">
              A reserva de emergência segue recebendo{" "}
              {currency.format(schedule.emergency.monthly)}/mês até{" "}
              {formatMonth(schedule.emergency.untilMonth)}.
            </p>
          ) : null}
        </div>
      ) : null}

      {schedule.extraNeeded > 0 ? (
        <div className="space-y-2 border-t bg-muted/40 px-4 py-3">
          <p>
            Faltam <strong>{currency.format(schedule.extraNeeded)}</strong> por
            mês para cumprir todas as datas.
          </p>
          {schedule.savings.length > 0 ? (
            <ul className="space-y-1 text-xs">
              {schedule.savings.map((saving) => (
                <li key={saving.groupId} className="flex justify-between gap-3">
                  <span>
                    <span aria-hidden="true">{saving.icon} </span>
                    {saving.label}
                    <span className="text-muted-foreground">
                      {" "}
                      (hoje ~{currency.format(saving.typical)}/mês)
                    </span>
                  </span>
                  <span className="shrink-0 text-success-foreground tabular-nums">
                    −{currency.format(saving.cut)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {schedule.adjustedDates.length > 0 ? (
            <p className="text-xs text-warning-foreground">
              Mesmo assim, o realista é{" "}
              {schedule.adjustedDates
                .map((item) => `${item.name} em ${formatMonth(item.to)}`)
                .join(" e ")}
              .
            </p>
          ) : null}
          {payload.budgets.length > 0 && proposal.status === "pending" ? (
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={includeBudgets}
                onChange={(event) => setIncludeBudgets(event.target.checked)}
                className="mt-0.5 size-3.5 accent-primary"
              />
              Criar orçamentos mensais para essas economias (
              {payload.budgets
                .map(
                  (budget) =>
                    `${budget.label} ${currency.format(budget.amount)}`,
                )
                .join(", ")}
              )
            </label>
          ) : null}
        </div>
      ) : null}

      {proposal.status === "pending" ? (
        <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              run(() =>
                applyProposal(proposal.id, {
                  includeBudgets: includeBudgets && payload.budgets.length > 0,
                }),
              )
            }
          >
            {pending
              ? "Criando…"
              : payload.goals.length === 1
                ? "Criar a meta"
                : `Criar ${payload.goals.length} metas`}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => dismissProposal(proposal.id))}
          >
            Agora não
          </Button>
          {error ? (
            <span role="alert" className="text-xs text-destructive-foreground">
              {error}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="border-t px-4 py-3 text-xs text-muted-foreground">
          Proposta dispensada.
        </p>
      )}
    </div>
  );
}
