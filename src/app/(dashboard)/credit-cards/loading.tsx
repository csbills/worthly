import { PageLoading, SurfaceSkeleton } from "@/components/page-skeletons";
import { PageHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreditCardsLoading() {
  return (
    <PageLoading label="Carregando os cartões">
      <PageHeader
        eyebrow="Crédito"
        title="Cartões"
        description="Faturas, limites e parcelamentos de todos os seus cartões em um só lugar."
      />
      <section className="flex flex-col items-center surface px-5 py-10">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="mt-3 h-11 w-56 rounded-lg" />
        <Skeleton className="mt-3 h-4 w-64 max-w-full rounded-md" />
      </section>
      <Skeleton className="h-8 w-44 rounded-lg" />
      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceSkeleton className="min-h-64" lines={5} />
        <SurfaceSkeleton className="min-h-64" lines={5} />
      </div>
    </PageLoading>
  );
}
