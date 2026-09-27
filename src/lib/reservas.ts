import { randomUUID } from "crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularSlotsLibres, horaAMinutos, seSuperponen } from "@/lib/horarios";
import {
  SENA_EXPIRACION_MIN,
  calcularMontoSena,
  construirUrlCheckout,
  wompiConfigurado,
} from "@/lib/pagos/wompi";
import { obtenerAppUrl } from "@/lib/notificaciones/mensajes";
import { procesarNotificacionesPendientes } from "@/lib/notificaciones/procesar";

type TxClient = Prisma.TransactionClient;

export const ESTADOS_ACTIVOS = ["PENDIENTE", "CONFIRMADA"] as const;

/**
 * Condicion Prisma para excluir reservas PENDIENTE con un pago de sena que
 * nunca se completo (el cliente abrio el checkout de Wompi y no volvio):
 * pasados SENA_EXPIRACION_MIN minutos, el slot vuelve a contar como libre
 * aunque el cron diario todavia no la haya marcado CANCELADA formalmente
 * (ver src/lib/pagos/expirar.ts).
 */
export function excluirPagosVencidos(): Prisma.ReservaWhereInput {
  const limite = new Date(Date.now() - SENA_EXPIRACION_MIN * 60_000);
  return {
    NOT: { estado: "PENDIENTE", estadoPago: "PENDIENTE", creadoEn: { lt: limite } },
  };
}

export class SlotNoDisponibleError extends Error {}

export function parseFechaColumna(fechaStr: string): Date {
  const [anio, mes, dia] = fechaStr.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

/**
 * Bloquea la fila del barbero (SELECT ... FOR UPDATE) para serializar
 * reservas/reprogramaciones concurrentes sobre el mismo barbero. Debe
 * llamarse al inicio de la transaccion, antes de leer/escribir reservas.
 */
export async function bloquearBarbero(tx: TxClient, barberoId: string) {
  await tx.$queryRaw`SELECT id FROM barberos WHERE id = ${barberoId} FOR UPDATE`;
}

/**
 * Lanza SlotNoDisponibleError si ya existe una reserva activa del barbero
 * que se superponga con el rango [hora, hora + duracionMin) en esa fecha.
 * `excluirReservaId` permite ignorar la propia reserva al reprogramar.
 */
export async function verificarSlotLibre(
  tx: TxClient,
  params: {
    barberoId: string;
    fecha: Date;
    hora: string;
    duracionMin: number;
    // Tiempo de traslado del turno que se esta creando/moviendo, si su
    // servicio es a domicilio (ver Servicio.aDomicilio).
    bufferTrasladoMin?: number;
    excluirReservaId?: string;
  },
) {
  const { barberoId, fecha, hora, duracionMin, bufferTrasladoMin = 0, excluirReservaId } = params;
  const nuevoInicio = horaAMinutos(hora);
  const nuevoFin = nuevoInicio + duracionMin + bufferTrasladoMin;

  const reservasDelDia = await tx.reserva.findMany({
    where: {
      barberoId,
      fecha,
      estado: { in: [...ESTADOS_ACTIVOS] },
      ...excluirPagosVencidos(),
      ...(excluirReservaId ? { id: { not: excluirReservaId } } : {}),
    },
    select: {
      hora: true,
      servicio: { select: { duracionMin: true, aDomicilio: true, tiempoTrasladoMin: true } },
    },
  });

  const hayConflicto = reservasDelDia.some((r) => {
    const inicio = horaAMinutos(r.hora);
    const bufferExistente = r.servicio.aDomicilio ? r.servicio.tiempoTrasladoMin ?? 0 : 0;
    const fin = inicio + r.servicio.duracionMin + bufferExistente;
    return seSuperponen(nuevoInicio, nuevoFin, inicio, fin);
  });

  if (hayConflicto) {
    throw new SlotNoDisponibleError("El horario ya no esta disponible");
  }
}

/**
 * Lanza SlotNoDisponibleError si [hora, hora + duracionMin) no cae
 * completamente dentro de alguna ventana de Disponibilidad activa del
 * barbero para el dia de la semana de `fecha`. El endpoint publico de
 * disponibilidad ya excluye estos horarios al armar la lista de slots, pero
 * eso no bloquea una llamada directa a la API de creacion/reprogramacion -
 * esta funcion es la que realmente lo impide a nivel de servidor.
 */
export async function verificarDentroDeDisponibilidad(
  tx: TxClient,
  params: { barberoId: string; fecha: Date; hora: string; duracionMin: number },
) {
  const { barberoId, fecha, hora, duracionMin } = params;
  const diaSemana = fecha.getUTCDay();
  const inicio = horaAMinutos(hora);
  const fin = inicio + duracionMin;

  const ventanas = await tx.disponibilidad.findMany({
    where: { barberoId, diaSemana, activo: true },
    select: { horaInicio: true, horaFin: true },
  });

  const dentroDeAlguna = ventanas.some((v) => {
    const vInicio = horaAMinutos(v.horaInicio);
    const vFin = horaAMinutos(v.horaFin);
    return inicio >= vInicio && fin <= vFin;
  });

  if (!dentroDeAlguna) {
    throw new SlotNoDisponibleError("El barbero no tiene disponibilidad en ese horario");
  }
}

/**
 * Slots libres para un barbero+servicio en una fecha dada. Compartido entre
 * `GET /api/disponibilidad` y el bot de WhatsApp para no duplicar la consulta
 * de ventanas/reservas ocupadas en dos lugares.
 */
export async function obtenerSlotsLibres(params: {
  barberoId: string;
  servicioId: string;
  fecha: Date;
}): Promise<{ slots: string[] } | { error: string }> {
  const { barberoId, servicioId, fecha } = params;
  const diaSemana = fecha.getUTCDay();

  const servicio = await prisma.servicio.findUnique({
    where: { id: servicioId },
    select: { duracionMin: true, activo: true, aDomicilio: true, tiempoTrasladoMin: true },
  });

  if (!servicio || !servicio.activo) {
    return { error: "Servicio no encontrado" };
  }

  const [ventanas, reservasActivas] = await Promise.all([
    prisma.disponibilidad.findMany({
      where: { barberoId, diaSemana, activo: true },
      select: { horaInicio: true, horaFin: true },
    }),
    prisma.reserva.findMany({
      where: {
        barberoId,
        fecha,
        estado: { in: [...ESTADOS_ACTIVOS] },
        ...excluirPagosVencidos(),
      },
      select: {
        hora: true,
        servicio: { select: { duracionMin: true, aDomicilio: true, tiempoTrasladoMin: true } },
      },
    }),
  ]);

  const ocupadas = reservasActivas.map((r) => ({
    hora: r.hora,
    duracionMin: r.servicio.duracionMin,
    bufferTrasladoMin: r.servicio.aDomicilio ? r.servicio.tiempoTrasladoMin ?? 0 : 0,
  }));

  const bufferMin = servicio.aDomicilio ? servicio.tiempoTrasladoMin ?? 0 : 0;
  const slots = calcularSlotsLibres(ventanas, ocupadas, servicio.duracionMin, 15, bufferMin);

  return { slots };
}

export type CrearReservaInput = {
  barberoId: string;
  servicioId: string;
  fecha: Date; // ya parseada con parseFechaColumna
  hora: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  direccionCliente?: string;
};

export type CrearReservaResultado = {
  id: string;
  token: string;
  estado: string;
  estadoPago: string;
  montoSena: string | null;
  pagoUrl: string | null;
  fecha: Date;
  hora: string;
};

/**
 * Logica completa de creacion de una reserva (concurrencia, disponibilidad,
 * sena via Wompi, notificacion de confirmacion). Compartida entre
 * `POST /api/reservas` y el bot de WhatsApp (src/lib/whatsapp-bot.ts) para
 * que ambos canales tengan exactamente las mismas garantias - nada de logica
 * de reserva duplicada/divergente entre el flujo web y el de chat.
 */
export async function crearReserva(input: CrearReservaInput): Promise<CrearReservaResultado> {
  const {
    barberoId,
    servicioId,
    fecha,
    hora,
    clienteNombre,
    clienteTelefono,
    clienteEmail,
    direccionCliente,
  } = input;

  const { reserva, pagoUrl } = await prisma.$transaction(async (tx) => {
    await bloquearBarbero(tx, barberoId);

    const [servicio, barbero] = await Promise.all([
      tx.servicio.findUnique({
        where: { id: servicioId },
        select: {
          id: true,
          activo: true,
          duracionMin: true,
          precio: true,
          aDomicilio: true,
          tiempoTrasladoMin: true,
        },
      }),
      tx.barbero.findUnique({
        where: { id: barberoId },
        select: { negocio: { select: { requiereSena: true, senaPorcentaje: true } } },
      }),
    ]);

    if (!servicio || !servicio.activo) {
      throw new SlotNoDisponibleError("Servicio no encontrado");
    }

    if (!barbero) {
      throw new SlotNoDisponibleError("Barbero no encontrado");
    }

    if (servicio.aDomicilio && !direccionCliente) {
      throw new SlotNoDisponibleError(
        "Este servicio es a domicilio: falta la direccion del cliente",
      );
    }

    await verificarDentroDeDisponibilidad(tx, {
      barberoId,
      fecha,
      hora,
      duracionMin: servicio.duracionMin,
    });

    await verificarSlotLibre(tx, {
      barberoId,
      fecha,
      hora,
      duracionMin: servicio.duracionMin,
      bufferTrasladoMin: servicio.aDomicilio ? servicio.tiempoTrasladoMin ?? 0 : 0,
    });

    const pideSena = barbero.negocio.requiereSena && barbero.negocio.senaPorcentaje != null;
    const montoSena = pideSena
      ? calcularMontoSena(Number(servicio.precio), Number(barbero.negocio.senaPorcentaje))
      : null;
    const cobroReal = pideSena && wompiConfigurado();

    const id = randomUUID();
    const token = randomUUID();
    const wompiReferencia = cobroReal ? `sena-${id}` : undefined;

    let pagoUrl: string | null = null;
    if (cobroReal && wompiReferencia) {
      pagoUrl = construirUrlCheckout({
        referencia: wompiReferencia,
        montoEnCentavos: Math.round(montoSena! * 100),
        redirectUrl: `${obtenerAppUrl()}/reserva/${token}`,
        nombreCliente: clienteNombre,
        emailCliente: clienteEmail,
      });
    }

    const nuevaReserva = await tx.reserva.create({
      data: {
        id,
        token,
        barberoId,
        servicioId,
        fecha,
        hora,
        clienteNombre,
        clienteTelefono,
        clienteEmail,
        direccionCliente: servicio.aDomicilio ? direccionCliente : undefined,
        estado: cobroReal ? "PENDIENTE" : "CONFIRMADA",
        estadoPago: pideSena ? (cobroReal ? "PENDIENTE" : "PAGADO") : "NO_APLICA",
        montoSena: montoSena ?? undefined,
        wompiReferencia,
      },
    });

    if (nuevaReserva.estado === "CONFIRMADA") {
      await tx.notificacion.create({
        data: {
          reservaId: nuevaReserva.id,
          tipo: "CONFIRMACION",
          canal: "EMAIL",
          destinatario: clienteEmail,
        },
      });
    }

    return { reserva: nuevaReserva, pagoUrl };
  });

  if (reserva.estado === "CONFIRMADA") {
    try {
      await procesarNotificacionesPendientes(reserva.id);
    } catch (error) {
      console.error("Error procesando notificaciones:", error);
    }
  }

  return {
    id: reserva.id,
    token: reserva.token,
    estado: reserva.estado,
    estadoPago: reserva.estadoPago,
    montoSena: reserva.montoSena?.toString() ?? null,
    pagoUrl,
    fecha: reserva.fecha,
    hora: reserva.hora,
  };
}
