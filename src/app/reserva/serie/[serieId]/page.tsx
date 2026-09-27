import { Brand } from "@/components/ui/brand";
import { Container } from "@/components/ui/container";
import { SerieDetalle } from "./serie-detalle";

export default async function SerieReservaPage({
  params,
}: {
  params: Promise<{ serieId: string }>;
}) {
  const { serieId } = await params;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-4 py-5">
        <Brand />
      </header>
      <Container size="sm" className="flex-1">
        <SerieDetalle serieId={serieId} />
      </Container>
    </div>
  );
}
