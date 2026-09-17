import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const negocio = await prisma.negocio.findFirst({
    where: { slug, activo: true },
    select: {
      id: true,
      nombre: true,
      slug: true,
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
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  return NextResponse.json(negocio);
}
