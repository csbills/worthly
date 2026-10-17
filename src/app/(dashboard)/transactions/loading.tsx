import {
  ListSkeleton,
  MetricsSkeleton,
  PageLoading,
} from "@/components/page-skeletons";
import { PageHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionsLoading() {
  return (
    <PageLoading label="Carregando as transações">
      <PageHeader
        eyebrow={<Skeleton className="h-4 w-28 rounded-md" />}
        title="Transações"
        description="Tudo o que entrou e saiu das suas contas e cartões, categorizado automaticamente."
      />
      <MetricsSkeleton count={4} />
      <ListSkeleton rows={10} />
    </PageLoading>
  );
}
