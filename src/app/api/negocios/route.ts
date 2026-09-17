import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ciudad = searchParams.get("ciudad");

  const negocios = await prisma.negocio.findMany({
    where: {
      activo: true,
      ...(ciudad ? { ciudad: { equals: ciudad, mode: "insensitive" } } : {}),
    },
    select: {
      nombre: true,
      slug: true,
      ciudad: true,
      direccion: true,
      _count: { select: { barberos: { where: { activo: true } } } },
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(
    negocios.map((n) => ({
      nombre: n.nombre,
      slug: n.slug,
      ciudad: n.ciudad,
      direccion: n.direccion,
      cantidadBarberos: n._count.barberos,
    })),
  );
}
