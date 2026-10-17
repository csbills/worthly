import {
  ChartSkeleton,
  PageHeaderSkeleton,
  PageLoading,
  SurfaceSkeleton,
} from "@/components/page-skeletons";

export default function OverviewLoading() {
  return (
    <PageLoading label="Carregando a visão geral">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-12 gap-4">
        <ChartSkeleton className="col-span-12 lg:col-span-7" />
        <SurfaceSkeleton className="col-span-12 lg:col-span-5" lines={4} />
        <ChartSkeleton className="col-span-12" />
        <SurfaceSkeleton className="col-span-12 min-h-80 lg:col-span-6" />
        <SurfaceSkeleton className="col-span-12 min-h-80 lg:col-span-6" />
      </div>
    </PageLoading>
  );
}
