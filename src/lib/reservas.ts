import type { Prisma } from "@/generated/prisma/client";
import { horaAMinutos, seSuperponen } from "@/lib/horarios";

type TxClient = Prisma.TransactionClient;

export const ESTADOS_ACTIVOS = ["PENDIENTE", "CONFIRMADA"] as const;

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
