import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarNegocio, puedeGestionarTurnos } from "@/lib/permisos";

export async function GET() {
  const session = await auth();
  if (!session || (!puedeGestionarNegocio(session) && !puedeGestionarTurnos(session))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // El negocio ve las resenas de todo su equipo; un barbero (empleado, no
  // dueño) solo ve las suyas.
  const filtroBarbero =
    puedeGestionarNegocio(session) && session.user.negocioId
      ? { negocioId: session.user.negocioId }
      : session.user.barberoId
        ? { id: session.user.barberoId }
        : null;

  if (!filtroBarbero) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resenas = await prisma.resena.findMany({
    where: { barbero: filtroBarbero },
    orderBy: { creadoEn: "desc" },
    take: 100,
    select: {
      id: true,
      calificacion: true,
      comentario: true,
      creadoEn: true,
      barbero: { select: { nombre: true } },
      reserva: { select: { clienteNombre: true, servicio: { select: { nombre: true } } } },
    },
  });

  return NextResponse.json(
    resenas.map((r) => ({
      id: r.id,
      calificacion: r.calificacion,
      comentario: r.comentario,
      fecha: r.creadoEn.toISOString().slice(0, 10),
      barbero: r.barbero.nombre,
      cliente: r.reserva.clienteNombre,
      servicio: r.reserva.servicio.nombre,
    })),
  );
}
