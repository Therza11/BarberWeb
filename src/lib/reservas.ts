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
    excluirReservaId?: string;
  },
) {
  const { barberoId, fecha, hora, duracionMin, excluirReservaId } = params;
  const nuevoInicio = horaAMinutos(hora);
  const nuevoFin = nuevoInicio + duracionMin;

  const reservasDelDia = await tx.reserva.findMany({
    where: {
      barberoId,
      fecha,
      estado: { in: [...ESTADOS_ACTIVOS] },
      ...(excluirReservaId ? { id: { not: excluirReservaId } } : {}),
    },
    select: { hora: true, servicio: { select: { duracionMin: true } } },
  });

  const hayConflicto = reservasDelDia.some((r) => {
    const inicio = horaAMinutos(r.hora);
    const fin = inicio + r.servicio.duracionMin;
    return seSuperponen(nuevoInicio, nuevoFin, inicio, fin);
  });

  if (hayConflicto) {
    throw new SlotNoDisponibleError("El horario ya no esta disponible");
  }
}
