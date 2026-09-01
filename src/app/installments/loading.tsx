import { DashboardShell } from "@/components/dashboard-shell";

export default function InstallmentsLoading() {
  return (
    <DashboardShell>
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="rounded-2xl border bg-card p-6 shadow-xs">
        <div className="grid gap-5 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={`summary-skeleton-${index + 1}`} className="space-y-3">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-7 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="mt-6 h-2 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={`row-skeleton-${index + 1}`}
            className="h-28 animate-pulse rounded-2xl border bg-card"
          />
        ))}
      </div>
    </DashboardShell>
  );
}
