import {
  ChartSkeleton,
  ListSkeleton,
  MetricsSkeleton,
  PageLoading,
  SurfaceSkeleton,
} from "@/components/page-skeletons";
import { PageHeader } from "@/components/ui/card";

export default function InvestmentsLoading() {
  return (
    <PageLoading label="Carregando os investimentos">
      <PageHeader
        eyebrow="Carteira"
        title="Investimentos"
        description="Renda fixa e renda variável consolidadas, com rentabilidade sobre o custo."
      />
      <MetricsSkeleton count={5} />
      <div className="grid gap-4 lg:grid-cols-12">
        <ChartSkeleton className="lg:col-span-8" />
        <SurfaceSkeleton className="lg:col-span-4" lines={5} />
      </div>
      <ListSkeleton rows={5} />
    </PageLoading>
  );
}
