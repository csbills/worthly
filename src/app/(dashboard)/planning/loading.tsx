import {
  PageHeaderSkeleton,
  PageLoading,
  SurfaceSkeleton,
} from "@/components/page-skeletons";

export default function PlanningLoading() {
  return (
    <PageLoading label="Carregando o planejamento">
      <PageHeaderSkeleton />
      <div className="grid gap-5 lg:grid-cols-2">
        <SurfaceSkeleton className="min-h-72 lg:col-span-2" lines={5} />
        <SurfaceSkeleton className="min-h-64" lines={4} />
        <SurfaceSkeleton className="min-h-64" lines={3} />
      </div>
    </PageLoading>
  );
}
