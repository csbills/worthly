import Link from "next/link";

import { getInsights } from "@/actions/insights";
import { Tito } from "@/components/mascot/tito";
import { assistantSuggestions } from "@/lib/assistant/prompt";
import type { Insight } from "@/lib/insights";
import { cn } from "@/lib/utils";

function askHref(question: string) {
  return `/assistant?q=${encodeURIComponent(question)}`;
}

function InsightItem({ insight }: { insight: Insight }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3 sm:px-5">
      <span
        aria-hidden="true"
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          insight.tone === "warning" && "bg-warning",
          insight.tone === "info" && "bg-assistant",
          insight.tone === "success" && "bg-success",
        )}
      />
      <div className="min-w-0 flex-1">
        <Link
          href={insight.href}
          className="text-sm font-medium underline-offset-2 hover:underline"
        >
          {insight.title}
        </Link>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          {insight.detail}
        </p>
      </div>
      {insight.ask ? (
        <Link
          href={askHref(insight.ask)}
          className="shrink-0 rounded-full bg-assistant-soft px-2.5 py-1 text-xs text-assistant transition-colors hover:bg-assistant/15"
        >
          Perguntar
        </Link>
      ) : null}
    </li>
  );
}

/**
 * O Tito na visão geral: uma caixa de pergunta que leva para a conversa e os
 * avisos do momento. Carrega à parte (Suspense) para não atrasar o painel.
 */
export async function TitoHome() {
  const insights = await getInsights();
  const lead = insights[0];

  return (
    <section className="surface col-span-12 overflow-hidden animate-rise-in">
      <div className="flex items-center gap-3 p-4 sm:p-5">
        <Tito mood={lead?.mood ?? "wave"} size="md" className="-my-2" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {lead ? "O Tito tem alguns avisos" : "Tudo tranquilo por aqui"}
          </p>
          <Link
            href="/assistant"
            className="mt-2 flex h-10 items-center rounded-full border bg-background/60 px-4 text-sm text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground"
          >
            Pergunte ao Tito sobre o seu dinheiro…
          </Link>
        </div>
      </div>

      {insights.length > 0 ? (
        <ul className="stagger divide-y border-t">
          {insights.map((insight) => (
            <InsightItem key={insight.id} insight={insight} />
          ))}
        </ul>
      ) : (
        <div className="flex gap-2 overflow-x-auto border-t px-4 py-3 sm:px-5">
          {assistantSuggestions.slice(0, 3).map((suggestion) => (
            <Link
              key={suggestion}
              href={askHref(suggestion)}
              className="shrink-0 rounded-full border px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-muted"
            >
              {suggestion}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function TitoHomeSkeleton() {
  return (
    <div className="surface col-span-12 flex items-center gap-3 p-4 sm:p-5">
      <Tito mood="rolling" size="md" className="-my-2" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-10 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}
