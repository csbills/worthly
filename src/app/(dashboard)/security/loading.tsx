import {
  ListSkeleton,
  PageLoading,
  SurfaceSkeleton,
} from "@/components/page-skeletons";
import { PageHeader } from "@/components/ui/card";

export default function SecurityLoading() {
  return (
    <PageLoading label="Carregando a segurança">
      <PageHeader
        eyebrow="Configurações"
        title="Segurança"
        description="Entre e desbloqueie o app com Face ID, Touch ID ou a biometria do Android, sem digitar a senha."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <ListSkeleton rows={2} />
        <SurfaceSkeleton lines={3} />
      </div>
    </PageLoading>
  );
}
