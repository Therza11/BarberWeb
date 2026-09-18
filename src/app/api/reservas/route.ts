import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  SlotNoDisponibleError,
  bloquearBarbero,
  parseFechaColumna,
  verificarSlotLibre,
} from "@/lib/reservas";
import { procesarNotificacionesPendientes } from "@/lib/notificaciones/procesar";

type ReservaInput = {
  barberoId: string;
  servicioId: string;
  fecha: string; // "YYYY-MM-DD"
  hora: string; // "HH:mm"
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  direccionCliente?: string;
};

export async function POST(request: NextRequest) {
  let body: Partial<ReservaInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const {
    barberoId,
    servicioId,
    fecha,
    hora,
    clienteNombre,
    clienteTelefono,
    clienteEmail,
    direccionCliente,
  } = body;

  if (
    !barberoId ||
    !servicioId ||
    !fecha ||
    !hora ||
    !clienteNombre ||
    !clienteTelefono ||
    !clienteEmail
  ) {
    return NextResponse.json(
      {
        error:
          "Faltan campos requeridos: barberoId, servicioId, fecha, hora, clienteNombre, clienteTelefono, clienteEmail",
      },
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
    const reserva = await prisma.$transaction(async (tx) => {
      // Bloquea la fila del barbero para serializar reservas concurrentes
      // sobre el mismo barbero (control de concurrencia a nivel de DB).
      await bloquearBarbero(tx, barberoId);

      const servicio = await tx.servicio.findUnique({
        where: { id: servicioId },
        select: {
          id: true,
          activo: true,
          duracionMin: true,
          aDomicilio: true,
          tiempoTrasladoMin: true,
        },
      });

      if (!servicio || !servicio.activo) {
        throw new SlotNoDisponibleError("Servicio no encontrado");
      }

      if (servicio.aDomicilio && !direccionCliente) {
        throw new SlotNoDisponibleError(
          "Este servicio es a domicilio: falta la direccion del cliente",
        );
      }

      await verificarSlotLibre(tx, {
        barberoId,
        fecha: fechaColumna,
        hora,
        duracionMin: servicio.duracionMin,
        bufferTrasladoMin: servicio.aDomicilio ? servicio.tiempoTrasladoMin ?? 0 : 0,
      });

      const nuevaReserva = await tx.reserva.create({
        data: {
          barberoId,
          servicioId,
          fecha: fechaColumna,
          hora,
          clienteNombre,
          clienteTelefono,
          clienteEmail,
          direccionCliente: servicio.aDomicilio ? direccionCliente : undefined,
          estado: "CONFIRMADA",
        },
      });

      // Notificacion de confirmacion: se encola aca (dentro de la misma
      // transaccion que crea la reserva) y se procesa/envia justo despues,
      // fuera de la transaccion.
      await tx.notificacion.create({
        data: {
          reservaId: nuevaReserva.id,
          tipo: "CONFIRMACION",
          canal: "EMAIL",
          destinatario: clienteEmail,
        },
      });

      return nuevaReserva;
    });

    try {
      await procesarNotificacionesPendientes(reserva.id);
    } catch (error) {
      console.error("Error procesando notificaciones:", error);
    }

    return NextResponse.json(
      {
        id: reserva.id,
        token: reserva.token,
        estado: reserva.estado,
        fecha,
        hora: reserva.hora,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SlotNoDisponibleError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
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
