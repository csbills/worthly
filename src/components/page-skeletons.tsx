import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Building blocks for the route `loading.tsx` files. They mirror the real
 * layouts closely so content swaps in without the page jumping around.
 */
export function PageLoading({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <output className="sr-only">{label}</output>
      {children}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-28 rounded-md" />
      <Skeleton className="h-9 w-48 rounded-lg" />
      <Skeleton className="h-4 w-full max-w-md rounded-md" />
    </div>
  );
}

export function SurfaceSkeleton({
  className,
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <section className={cn("min-w-0 surface p-5 md:p-6", className)}>
      <Skeleton className="h-4 w-32 rounded-md" />
      <Skeleton className="mt-2 h-3 w-48 rounded-md" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            key={index}
            className="h-4 rounded-md"
            style={{ width: `${90 - index * 12}%` }}
          />
        ))}
      </div>
    </section>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn("min-w-0 surface p-5 md:p-6", className)}>
      <Skeleton className="h-4 w-36 rounded-md" />
      <Skeleton className="mt-2 h-3 w-56 rounded-md" />
      <Skeleton className="mt-6 h-56 w-full" />
    </section>
  );
}

export function MetricsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border xl:grid-cols-[repeat(var(--metric-count),minmax(0,1fr))]"
      style={{ "--metric-count": count } as React.CSSProperties}
    >
      {Array.from({ length: count }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <div key={index} className="min-w-0 bg-card p-4 sm:p-5">
          <Skeleton className="h-3.5 w-20 rounded-md" />
          <Skeleton className="mt-3 h-6 w-28 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 overflow-hidden surface", className)}>
      <div className="border-b px-5 py-4">
        <Skeleton className="h-4 w-36 rounded-md" />
        <Skeleton className="mt-2 h-3 w-52 rounded-md" />
      </div>
      <ul className="divide-y">
        {Array.from({ length: rows }, (_, index) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            key={index}
            className="flex items-center gap-3 px-5 py-3"
          >
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/5 rounded-md" />
              <Skeleton className="h-3 w-1/4 rounded-md" />
            </div>
            <Skeleton className="h-4 w-20 rounded-md" />
          </li>
        ))}
      </ul>
    </section>
  );
}
