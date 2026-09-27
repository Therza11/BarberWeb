import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  SlotNoDisponibleError,
  bloquearBarbero,
  parseFechaColumna,
  verificarDentroDeDisponibilidad,
  verificarSlotLibre,
} from "@/lib/reservas";
import {
  SERIE_MAX_INTERVALO_SEMANAS,
  SERIE_MAX_OCURRENCIAS,
  SERIE_MIN_INTERVALO_SEMANAS,
  SERIE_MIN_OCURRENCIAS,
} from "@/lib/series";
import { procesarNotificacionesPendientes } from "@/lib/notificaciones/procesar";

type ReservaRecurrenteInput = {
  barberoId: string;
  servicioId: string;
  fecha: string; // fecha de la primera ocurrencia, "YYYY-MM-DD"
  hora: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  direccionCliente?: string;
  intervaloSemanas: number;
  cantidadOcurrencias: number;
};

// Crea una serie de turnos recurrentes (misma hora, mismo barbero/servicio,
// cada N semanas). Todo o nada: si una sola ocurrencia no tiene el horario
// disponible, se rechaza la serie completa en vez de crear una parte. No
// disponible cuando el negocio pide sena (ver Negocio.requiereSena) - cobrar
// un deposito por N turnos futuros a la vez queda fuera de esta version.
export async function POST(request: NextRequest) {
  let body: Partial<ReservaRecurrenteInput>;
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
    intervaloSemanas,
    cantidadOcurrencias,
  } = body;

  if (
    !barberoId ||
    !servicioId ||
    !fecha ||
    !hora ||
    !clienteNombre ||
    !clienteTelefono ||
    !clienteEmail ||
    !intervaloSemanas ||
    !cantidadOcurrencias
  ) {
    return NextResponse.json(
      {
        error:
          "Faltan campos requeridos: barberoId, servicioId, fecha, hora, clienteNombre, clienteTelefono, clienteEmail, intervaloSemanas, cantidadOcurrencias",
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

  if (
    !Number.isInteger(intervaloSemanas) ||
    intervaloSemanas < SERIE_MIN_INTERVALO_SEMANAS ||
    intervaloSemanas > SERIE_MAX_INTERVALO_SEMANAS
  ) {
    return NextResponse.json(
      {
        error: `intervaloSemanas debe ser un entero entre ${SERIE_MIN_INTERVALO_SEMANAS} y ${SERIE_MAX_INTERVALO_SEMANAS}`,
      },
      { status: 400 },
    );
  }

  if (
    !Number.isInteger(cantidadOcurrencias) ||
    cantidadOcurrencias < SERIE_MIN_OCURRENCIAS ||
    cantidadOcurrencias > SERIE_MAX_OCURRENCIAS
  ) {
    return NextResponse.json(
      {
        error: `cantidadOcurrencias debe ser un entero entre ${SERIE_MIN_OCURRENCIAS} y ${SERIE_MAX_OCURRENCIAS}`,
      },
      { status: 400 },
    );
  }

  const primeraFechaColumna = parseFechaColumna(fecha);
  const fechasColumna = Array.from({ length: cantidadOcurrencias }, (_, i) => {
    const d = new Date(primeraFechaColumna);
    d.setUTCDate(d.getUTCDate() + i * intervaloSemanas * 7);
    return d;
  });

  try {
    const { serieId, ocurrencias } = await prisma.$transaction(async (tx) => {
      await bloquearBarbero(tx, barberoId);

      const [servicio, barbero] = await Promise.all([
        tx.servicio.findUnique({
          where: { id: servicioId },
          select: {
            activo: true,
            duracionMin: true,
            aDomicilio: true,
            tiempoTrasladoMin: true,
          },
        }),
        tx.barbero.findUnique({
          where: { id: barberoId },
          select: { negocio: { select: { requiereSena: true } } },
        }),
      ]);

      if (!servicio || !servicio.activo) {
        throw new SlotNoDisponibleError("Servicio no encontrado");
      }
      if (!barbero) {
        throw new SlotNoDisponibleError("Barbero no encontrado");
      }
      if (barbero.negocio.requiereSena) {
        throw new SlotNoDisponibleError(
          "Este negocio pide sena para reservar: los turnos recurrentes no estan disponibles por ahora",
        );
      }
      if (servicio.aDomicilio && !direccionCliente) {
        throw new SlotNoDisponibleError(
          "Este servicio es a domicilio: falta la direccion del cliente",
        );
      }

      const bufferTrasladoMin = servicio.aDomicilio ? servicio.tiempoTrasladoMin ?? 0 : 0;

      for (const fechaOcurrencia of fechasColumna) {
        try {
          await verificarDentroDeDisponibilidad(tx, {
            barberoId,
            fecha: fechaOcurrencia,
            hora,
            duracionMin: servicio.duracionMin,
          });
          await verificarSlotLibre(tx, {
            barberoId,
            fecha: fechaOcurrencia,
            hora,
            duracionMin: servicio.duracionMin,
            bufferTrasladoMin,
          });
        } catch (error) {
          if (error instanceof SlotNoDisponibleError) {
            const fechaStr = fechaOcurrencia.toISOString().slice(0, 10);
            throw new SlotNoDisponibleError(`Turno del ${fechaStr}: ${error.message}`);
          }
          throw error;
        }
      }

      const serieId = randomUUID();
      const total = fechasColumna.length;
      const creadas = [];

      for (let i = 0; i < fechasColumna.length; i++) {
        const nuevaReserva = await tx.reserva.create({
          data: {
            barberoId,
            servicioId,
            fecha: fechasColumna[i],
            hora,
            clienteNombre,
            clienteTelefono,
            clienteEmail,
            direccionCliente: servicio.aDomicilio ? direccionCliente : undefined,
            estado: "CONFIRMADA",
            serieId,
            serieIndice: i + 1,
            serieTotal: total,
          },
        });
        creadas.push(nuevaReserva);
      }

      // Una sola notificacion para toda la serie (no una por ocurrencia, para
      // no mandar N emails de golpe) - ver armarMensaje en mensajes.ts, que
      // arma un mensaje distinto cuando serieTotal > 1, con link a la vista
      // de la serie en vez de a una sola reserva.
      await tx.notificacion.create({
        data: {
          reservaId: creadas[0].id,
          tipo: "CONFIRMACION",
          canal: "EMAIL",
          destinatario: clienteEmail,
        },
      });

      return { serieId, ocurrencias: creadas };
    });

    try {
      await procesarNotificacionesPendientes(ocurrencias[0].id);
    } catch (error) {
      console.error("Error procesando notificaciones:", error);
    }

    return NextResponse.json(
      {
        serieId,
        ocurrencias: ocurrencias.map((r) => ({
          id: r.id,
          token: r.token,
          fecha: r.fecha.toISOString().slice(0, 10),
          hora: r.hora,
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SlotNoDisponibleError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Uno de los horarios ya no esta disponible" },
        { status: 409 },
      );
    }
    throw error;
  }
}
