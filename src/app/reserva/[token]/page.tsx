import { Brand } from "@/components/ui/brand";
import { Container } from "@/components/ui/container";
import { ReservaDetalle } from "./reserva-detalle";

export default async function ReservaPage({
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
        <ReservaDetalle token={token} />
      </Container>
    </div>
  );
}
