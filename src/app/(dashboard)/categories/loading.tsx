import { ListSkeleton, PageLoading } from "@/components/page-skeletons";
import { PageHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesLoading() {
  return (
    <PageLoading label="Carregando as categorias">
      <PageHeader
        eyebrow="Gastos"
        title="Categorias"
        description="Para onde vai o seu dinheiro, agrupado por categoria."
      />
      <section className="grid items-center gap-6 surface p-5 md:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)] md:p-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
        <Skeleton className="mx-auto size-[220px] rounded-full" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-4/5 rounded-md" />
          <Skeleton className="h-4 w-3/5 rounded-md" />
        </div>
      </section>
      <ListSkeleton rows={8} />
    </PageLoading>
  );
}
