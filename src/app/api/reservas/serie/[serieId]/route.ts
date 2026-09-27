import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Publico, sin login: serieId es un uuid no adivinable, mismo modelo de
// confianza que el token individual de cada reserva.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ serieId: string }> },
) {
  const { serieId } = await params;

  const ocurrencias = await prisma.reserva.findMany({
    where: { serieId },
    orderBy: { fecha: "asc" },
    select: {
      token: true,
      fecha: true,
      hora: true,
      estado: true,
      serieIndice: true,
      serieTotal: true,
      barbero: { select: { nombre: true, negocio: { select: { nombre: true } } } },
      servicio: { select: { nombre: true, duracionMin: true, precio: true } },
    },
  });

  if (ocurrencias.length === 0) {
    return NextResponse.json({ error: "Serie no encontrada" }, { status: 404 });
  }

  const [primera] = ocurrencias;

  return NextResponse.json({
    negocio: primera.barbero.negocio.nombre,
    barbero: primera.barbero.nombre,
    servicio: primera.servicio.nombre,
    duracionMin: primera.servicio.duracionMin,
    precio: primera.servicio.precio.toString(),
    ocurrencias: ocurrencias.map((r) => ({
      token: r.token,
      fecha: r.fecha.toISOString().slice(0, 10),
      hora: r.hora,
      estado: r.estado,
      indice: r.serieIndice,
      total: r.serieTotal,
    })),
  });
}
