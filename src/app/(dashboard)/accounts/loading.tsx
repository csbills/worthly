import {
  ListSkeleton,
  PageLoading,
  SurfaceSkeleton,
} from "@/components/page-skeletons";
import { PageHeader } from "@/components/ui/card";

export default function AccountsLoading() {
  return (
    <PageLoading label="Carregando as conexões">
      <PageHeader
        eyebrow="Configurações"
        title="Conexões"
        description="Os bancos autorizados no Meu Pluggy e a aplicação Pluggy que esta instância usa para lê-los."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <ListSkeleton rows={5} />
        <div className="flex min-w-0 flex-col gap-4">
          <SurfaceSkeleton lines={3} />
          <SurfaceSkeleton lines={2} />
        </div>
      </div>
    </PageLoading>
  );
}
