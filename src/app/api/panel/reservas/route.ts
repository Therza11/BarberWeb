import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarTurnos } from "@/lib/permisos";

export async function GET() {
  const session = await auth();
  if (!session || !puedeGestionarTurnos(session) || !session.user.barberoId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const reservas = await prisma.reserva.findMany({
    where: {
      barberoId: session.user.barberoId,
      estado: { in: ["PENDIENTE", "CONFIRMADA"] },
    },
    orderBy: [{ fecha: "asc" }, { hora: "asc" }],
    select: {
      id: true,
      clienteNombre: true,
      fecha: true,
      hora: true,
      estado: true,
      servicio: { select: { nombre: true, precio: true } },
    },
  });

  return NextResponse.json(
    reservas.map((r) => ({
      ...r,
      fecha: r.fecha.toISOString().slice(0, 10),
      servicio: { ...r.servicio, precio: r.servicio.precio.toString() },
    })),
  );
}
