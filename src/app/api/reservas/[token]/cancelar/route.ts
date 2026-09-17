import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ESTADOS_ACTIVOS } from "@/lib/reservas";
import { procesarNotificacionesPendientes } from "@/lib/notificaciones/procesar";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const reserva = await prisma.reserva.findUnique({
    where: { token },
    select: { id: true, estado: true, clienteEmail: true },
  });

  if (!reserva) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }

  if (!ESTADOS_ACTIVOS.includes(reserva.estado as (typeof ESTADOS_ACTIVOS)[number])) {
    return NextResponse.json(
      { error: "La reserva ya no se puede cancelar" },
      { status: 409 },
    );
  }

  await prisma.$transaction([
    prisma.reserva.update({
      where: { id: reserva.id },
      data: { estado: "CANCELADA" },
    }),
    prisma.notificacion.create({
      data: {
        reservaId: reserva.id,
        tipo: "CANCELACION",
        canal: "EMAIL",
        destinatario: reserva.clienteEmail,
      },
    }),
  ]);

  try {
    await procesarNotificacionesPendientes();
  } catch (error) {
    console.error("Error procesando notificaciones:", error);
  }

  return NextResponse.json({ estado: "CANCELADA" });
}
