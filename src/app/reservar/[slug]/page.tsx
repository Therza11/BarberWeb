import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obtenerPromediosPorBarbero } from "@/lib/resenas";
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
      requiereSena: true,
      barberos: {
        where: { activo: true },
        select: { id: true, nombre: true, sucursalId: true },
      },
      sucursales: {
        where: { activo: true },
        select: { id: true, nombre: true, direccion: true, ciudad: true },
        orderBy: { nombre: "asc" },
      },
      servicios: {
        where: { activo: true },
        select: {
          id: true,
          nombre: true,
          duracionMin: true,
          precio: true,
          aDomicilio: true,
        },
      },
    },
  });

  if (!negocio) {
    notFound();
  }

  const promedios = await obtenerPromediosPorBarbero(negocio.barberos.map((b) => b.id));
  const barberosConRating = negocio.barberos.map((b) => ({
    ...b,
    promedio: promedios.get(b.id)?.promedio ?? null,
    cantidadResenas: promedios.get(b.id)?.cantidad ?? 0,
  }));

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

        {process.env.WHATSAPP_DISPLAY_NUMBER && (
          <a
            href={`https://wa.me/${process.env.WHATSAPP_DISPLAY_NUMBER}?text=${encodeURIComponent(`Hola, quiero reservar en ${slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-success/40 px-3 py-2 text-sm text-success hover:bg-success/10"
          >
            Reservar por WhatsApp
          </a>
        )}

        <Card className="mt-6">
          <ReservaForm
            barberos={barberosConRating}
            sucursales={negocio.sucursales}
            permiteRecurrente={!negocio.requiereSena}
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
