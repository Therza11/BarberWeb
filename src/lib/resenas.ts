import { prisma } from "@/lib/prisma";

export type PromedioResenas = { promedio: number | null; cantidad: number };

export async function obtenerPromediosPorBarbero(
  barberoIds: string[],
): Promise<Map<string, PromedioResenas>> {
  if (barberoIds.length === 0) return new Map();

  const grupos = await prisma.resena.groupBy({
    by: ["barberoId"],
    where: { barberoId: { in: barberoIds } },
    _avg: { calificacion: true },
    _count: { _all: true },
  });

  return new Map(
    grupos.map((g) => [g.barberoId, { promedio: g._avg.calificacion, cantidad: g._count._all }]),
  );
}

// Promedio agregado de TODAS las resenas de los barberos de un negocio (para
// mostrar una sola calificacion por barberia en el directorio publico).
export async function obtenerPromedioNegocio(negocioId: string): Promise<PromedioResenas> {
  const resultado = await prisma.resena.aggregate({
    where: { barbero: { negocioId } },
    _avg: { calificacion: true },
    _count: { _all: true },
  });

  return { promedio: resultado._avg.calificacion, cantidad: resultado._count._all };
}
