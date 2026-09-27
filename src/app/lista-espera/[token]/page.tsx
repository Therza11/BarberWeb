import { Brand } from "@/components/ui/brand";
import { Container } from "@/components/ui/container";
import { ListaEsperaDetalle } from "./lista-espera-detalle";

export default async function ListaEsperaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-4 py-5">
        <Brand />
      </header>
      <Container size="sm" className="flex-1">
        <ListaEsperaDetalle token={token} />
      </Container>
    </div>
  );
}
