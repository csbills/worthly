import {
  PageHeaderSkeleton,
  PageLoading,
  SurfaceSkeleton,
} from "@/components/page-skeletons";

export default function FinancialPlanLoading() {
  return (
    <PageLoading label="Montando o seu plano">
      <PageHeaderSkeleton />
      <SurfaceSkeleton className="min-h-56" lines={4} />
      <div className="grid gap-5 lg:grid-cols-2">
        <SurfaceSkeleton className="min-h-80" lines={5} />
        <SurfaceSkeleton className="min-h-80" lines={5} />
      </div>
    </PageLoading>
  );
}
