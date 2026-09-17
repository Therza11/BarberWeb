import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Brand } from "@/components/ui/brand";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { ReservaForm } from "./reserva-form";

export default async function ReservarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const negocio = await prisma.negocio.findFirst({
    where: { slug, activo: true },
    select: {
      id: true,
      nombre: true,
      direccion: true,
      barberos: {
        where: { activo: true },
        select: { id: true, nombre: true },
      },
      servicios: {
        where: { activo: true },
        select: { id: true, nombre: true, duracionMin: true, precio: true },
      },
    },
  });

  if (!negocio) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-4 py-5">
        <Brand />
      </header>

      <Container size="sm" className="flex-1">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
          Reservar turno
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">{negocio.nombre}</h1>
        {negocio.direccion && (
          <p className="mt-1 text-sm text-fg-muted">{negocio.direccion}</p>
        )}

        <Card className="mt-6">
          <ReservaForm
            barberos={negocio.barberos}
            servicios={negocio.servicios.map((s) => ({
              ...s,
              precio: s.precio.toString(),
            }))}
          />
        </Card>
      </Container>
    </div>
  );
}
