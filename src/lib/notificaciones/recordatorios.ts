import { prisma } from "@/lib/prisma";
import { ESTADOS_ACTIVOS } from "@/lib/reservas";

export async function generarRecordatorios() {
  const hoy = new Date();
  const manana = new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + 1),
  );

  const reservas = await prisma.reserva.findMany({
    where: {
      fecha: manana,
      estado: { in: [...ESTADOS_ACTIVOS] },
      notificaciones: { none: { tipo: "RECORDATORIO" } },
    },
    select: { id: true, clienteEmail: true },
  });

  for (const reserva of reservas) {
    await prisma.notificacion.create({
      data: {
        reservaId: reserva.id,
        tipo: "RECORDATORIO",
        canal: "EMAIL",
        destinatario: reserva.clienteEmail,
      },
    });
  }

  return { creados: reservas.length };
}
