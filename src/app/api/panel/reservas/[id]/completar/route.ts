import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
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
    select: {
      id: true,
      barberoId: true,
      servicioId: true,
      estado: true,
      servicio: { select: { precio: true } },
    },
  });

  if (!reserva || reserva.barberoId !== session.user.barberoId) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  if (!ESTADOS_ACTIVOS.includes(reserva.estado as (typeof ESTADOS_ACTIVOS)[number])) {
    return NextResponse.json(
      { error: "El turno ya no se puede marcar como completado" },
      { status: 409 },
    );
  }

  const regla = await prisma.comision.findUnique({
    where: {
      barberoId_servicioId: {
        barberoId: reserva.barberoId,
        servicioId: reserva.servicioId,
      },
    },
  });

  let comisionMonto: Prisma.Decimal | null = null;
  if (regla?.porcentaje) {
    comisionMonto = reserva.servicio.precio
      .mul(regla.porcentaje)
      .div(100);
  } else if (regla?.montoFijo) {
    comisionMonto = regla.montoFijo;
  }

  const actualizada = await prisma.reserva.update({
    where: { id },
    data: {
      estado: "COMPLETADA",
      comisionPorcentaje: regla?.porcentaje ?? null,
      comisionMontoFijo: regla?.montoFijo ?? null,
      comisionMonto,
    },
  });

  return NextResponse.json({
    estado: actualizada.estado,
    comisionMonto: actualizada.comisionMonto?.toString() ?? null,
  });
}
