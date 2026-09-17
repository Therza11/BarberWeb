import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ESTADOS_ACTIVOS } from "@/lib/reservas";
import { puedeGestionarTurnos } from "@/lib/permisos";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || !puedeGestionarTurnos(session) || !session.user.barberoId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const reserva = await prisma.reserva.findUnique({
    where: { id },
    select: { id: true, barberoId: true, estado: true },
  });

  if (!reserva || reserva.barberoId !== session.user.barberoId) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  if (!ESTADOS_ACTIVOS.includes(reserva.estado as (typeof ESTADOS_ACTIVOS)[number])) {
    return NextResponse.json(
      { error: "El turno ya no se puede marcar como no-asistio" },
      { status: 409 },
    );
  }

  const actualizada = await prisma.reserva.update({
    where: { id },
    data: { estado: "NO_ASISTIO" },
  });

  return NextResponse.json({ estado: actualizada.estado });
}
