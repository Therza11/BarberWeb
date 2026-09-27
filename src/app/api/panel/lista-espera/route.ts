import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarNegocio, puedeGestionarTurnos } from "@/lib/permisos";

export async function GET() {
  const session = await auth();
  if (!session || (!puedeGestionarNegocio(session) && !puedeGestionarTurnos(session))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Mismo criterio que /api/panel/resenas: el negocio ve la lista de espera
  // de todo su equipo, un barbero empleado (no independiente/dueño) solo la
  // suya.
  const filtroBarbero =
    puedeGestionarNegocio(session) && session.user.negocioId
      ? { negocioId: session.user.negocioId }
      : session.user.barberoId
        ? { id: session.user.barberoId }
        : null;

  if (!filtroBarbero) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const entradas = await prisma.listaEspera.findMany({
    where: { barbero: filtroBarbero, estado: { in: ["ACTIVA", "NOTIFICADA"] } },
    orderBy: [{ fecha: "asc" }, { creadoEn: "asc" }],
    select: {
      id: true,
      fecha: true,
      estado: true,
      clienteNombre: true,
      clienteTelefono: true,
      barbero: { select: { nombre: true } },
      servicio: { select: { nombre: true } },
    },
  });

  return NextResponse.json(
    entradas.map((e) => ({
      id: e.id,
      fecha: e.fecha.toISOString().slice(0, 10),
      estado: e.estado,
      clienteNombre: e.clienteNombre,
      clienteTelefono: e.clienteTelefono,
      barbero: e.barbero.nombre,
      servicio: e.servicio.nombre,
    })),
  );
}
