import type * as React from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="card"
      className={cn("surface flex min-w-0 flex-col p-5 md:p-6", className)}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex items-start justify-between gap-4", className)}
      {...props}
    />
  );
}

/** Quiet sentence-case label that sits above a card's headline number. */
export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/** The big tabular number every finance card leads with. */
export function Figure({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-[1.75rem] leading-none font-normal tracking-[-0.035em] tabular-nums md:text-[2rem]",
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-4 md:flex-row md:items-end",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-sm text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-[1.75rem] leading-tight font-normal tracking-[-0.03em] md:text-[2rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

const noticeTones = {
  info: "border-info/20 bg-info/[0.06] text-info-foreground",
  success: "border-success/20 bg-success/[0.07] text-success-foreground",
  warning: "border-warning/25 bg-warning/[0.08] text-warning-foreground",
  danger:
    "border-destructive/20 bg-destructive/[0.06] text-destructive-foreground",
} as const;

export function Notice({
  tone = "info",
  className,
  ...props
}: React.ComponentProps<"p"> & { tone?: keyof typeof noticeTones }) {
  return (
    <p
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm leading-6",
        noticeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

const badgeTones = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/10 text-success-foreground",
  danger: "bg-destructive/10 text-destructive-foreground",
  info: "bg-info/10 text-info-foreground",
  warning: "bg-warning/12 text-warning-foreground",
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-medium tabular-nums",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
