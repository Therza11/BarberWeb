import { prisma } from "@/lib/prisma";
import { enviarWhatsapp } from "./whatsapp";
import { enviarEmail } from "./email";
import { armarMensaje } from "./mensajes";

/**
 * Procesa notificaciones PENDIENTE y las envia. Sin `reservaId`, barre TODA
 * la tabla (uso pensado solo para el cron diario /api/cron/notificaciones).
 * Al crear/cancelar una reserva, en cambio, se pasa `reservaId` para
 * procesar solo esa notificacion puntual: si se barriera todo el sistema en
 * cada request, una reserva de un negocio quedaria esperando el envio de
 * notificaciones pendientes de OTROS negocios (o de un canal caido),
 * arriesgando el timeout de function serverless por algo ajeno a esa reserva.
 */
export async function procesarNotificacionesPendientes(reservaId?: string) {
  const pendientes = await prisma.notificacion.findMany({
    where: { estado: "PENDIENTE", ...(reservaId ? { reservaId } : {}) },
    include: {
      reserva: {
        select: {
          clienteNombre: true,
          fecha: true,
          hora: true,
          token: true,
          barbero: { select: { nombre: true, negocio: { select: { nombre: true } } } },
          servicio: { select: { nombre: true } },
        },
      },
    },
  });

  let enviadas = 0;
  let fallidas = 0;

  for (const notificacion of pendientes) {
    const mensaje = armarMensaje(notificacion.tipo, {
      clienteNombre: notificacion.reserva.clienteNombre,
      negocio: notificacion.reserva.barbero.negocio.nombre,
      barbero: notificacion.reserva.barbero.nombre,
      servicio: notificacion.reserva.servicio.nombre,
      fecha: notificacion.reserva.fecha.toISOString().slice(0, 10),
      hora: notificacion.reserva.hora,
      token: notificacion.reserva.token,
    });

    try {
      if (notificacion.canal === "WHATSAPP") {
        await enviarWhatsapp(notificacion.destinatario, mensaje);
      } else {
        await enviarEmail(notificacion.destinatario, "Actualizacion de tu turno", mensaje);
      }

      await prisma.notificacion.update({
        where: { id: notificacion.id },
        data: { estado: "ENVIADA", enviadaEn: new Date() },
      });
      enviadas++;
    } catch (error) {
      await prisma.notificacion.update({
        where: { id: notificacion.id },
        data: {
          estado: "FALLIDA",
          error: error instanceof Error ? error.message : "Error desconocido",
        },
      });
      fallidas++;
    }
  }

  return { procesadas: pendientes.length, enviadas, fallidas };
}
