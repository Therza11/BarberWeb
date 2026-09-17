import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "NEGOCIO" || !session.user.negocioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const reservas = await prisma.reserva.findMany({
    where: {
      estado: "COMPLETADA",
      barbero: { negocioId: session.user.negocioId },
    },
    orderBy: [{ fecha: "desc" }, { hora: "desc" }],
    take: 100,
    select: {
      id: true,
      fecha: true,
      hora: true,
      clienteNombre: true,
      comisionMonto: true,
      barbero: { select: { nombre: true } },
      servicio: { select: { nombre: true, precio: true } },
    },
  });

  return NextResponse.json(
    reservas.map((r) => ({
      id: r.id,
      fecha: r.fecha.toISOString().slice(0, 10),
      hora: r.hora,
      clienteNombre: r.clienteNombre,
      barbero: r.barbero.nombre,
      servicio: r.servicio.nombre,
      precio: r.servicio.precio.toString(),
      comisionMonto: r.comisionMonto?.toString() ?? null,
    })),
  );
}
