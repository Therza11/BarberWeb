import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ESTADOS_ACTIVOS,
  SlotNoDisponibleError,
  bloquearBarbero,
  parseFechaColumna,
  verificarSlotLibre,
} from "@/lib/reservas";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let body: { fecha?: string; hora?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { fecha, hora } = body;

  if (!fecha || !hora) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: fecha, hora" },
      { status: 400 },
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
    return NextResponse.json(
      { error: "fecha debe ser YYYY-MM-DD y hora debe ser HH:mm" },
      { status: 400 },
    );
  }

  const fechaColumna = parseFechaColumna(fecha);

  try {
    const reservaActualizada = await prisma.$transaction(async (tx) => {
      const reserva = await tx.reserva.findUnique({
        where: { token },
        select: {
          id: true,
          barberoId: true,
          estado: true,
          servicio: { select: { duracionMin: true, aDomicilio: true, tiempoTrasladoMin: true } },
        },
      });

      if (!reserva) {
        throw new SlotNoDisponibleError("Reserva no encontrada");
      }

      if (!ESTADOS_ACTIVOS.includes(reserva.estado as (typeof ESTADOS_ACTIVOS)[number])) {
        throw new SlotNoDisponibleError("La reserva ya no se puede reprogramar");
      }

      // Bloquea la fila del barbero para serializar reprogramaciones/reservas
      // concurrentes sobre el mismo barbero (mismo control de concurrencia
      // que al crear una reserva).
      await bloquearBarbero(tx, reserva.barberoId);

      await verificarSlotLibre(tx, {
        barberoId: reserva.barberoId,
        fecha: fechaColumna,
        hora,
        duracionMin: reserva.servicio.duracionMin,
        bufferTrasladoMin: reserva.servicio.aDomicilio
          ? reserva.servicio.tiempoTrasladoMin ?? 0
          : 0,
        excluirReservaId: reserva.id,
      });

      return tx.reserva.update({
        where: { id: reserva.id },
        data: { fecha: fechaColumna, hora },
      });
    });

    return NextResponse.json({
      fecha,
      hora: reservaActualizada.hora,
      estado: reservaActualizada.estado,
    });
  } catch (error) {
    if (error instanceof SlotNoDisponibleError) {
      const status = error.message === "Reserva no encontrada" ? 404 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "El horario ya no esta disponible" },
        { status: 409 },
      );
    }
    throw error;
  }
}
