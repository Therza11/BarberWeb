import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerPromedioNegocio } from "@/lib/resenas";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ciudad = searchParams.get("ciudad");

  const negocios = await prisma.negocio.findMany({
    where: {
      activo: true,
      ...(ciudad ? { ciudad: { equals: ciudad, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      nombre: true,
      slug: true,
      ciudad: true,
      direccion: true,
      _count: { select: { barberos: { where: { activo: true } } } },
    },
    orderBy: { nombre: "asc" },
  });

  // Directorio tipicamente chico: una consulta de agregacion por negocio es
  // aceptable (mismo criterio que el N+1 de clientes nuevos/recurrentes en
  // src/lib/reportes.ts) y evita tener que agrupar resenas por negocioId, que
  // Resena no tiene como columna propia (solo barberoId).
  const promedios = await Promise.all(negocios.map((n) => obtenerPromedioNegocio(n.id)));

  return NextResponse.json(
    negocios.map((n, i) => ({
      nombre: n.nombre,
      slug: n.slug,
      ciudad: n.ciudad,
      direccion: n.direccion,
      cantidadBarberos: n._count.barberos,
      promedio: promedios[i].promedio,
      cantidadResenas: promedios[i].cantidad,
    })),
  );
}
