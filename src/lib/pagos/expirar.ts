import { prisma } from "@/lib/prisma";
import { SENA_EXPIRACION_MIN } from "./wompi";

// Limpieza de reservas que quedaron con el pago de sena a medias (el cliente
// abrio el checkout de Wompi y nunca volvio). El slot ya se libera antes de
// esto para nuevas busquedas (ver verificarSlotLibre/disponibilidad), esto
// solo pasa el registro a un estado final para que no quede "pendiente" para
// siempre en los reportes del negocio. Se llama desde el cron diario de
// recordatorios porque Vercel Hobby no permite un cron propio mas frecuente.
export async function expirarReservasPendientesDePago() {
  const limite = new Date(Date.now() - SENA_EXPIRACION_MIN * 60_000);

  const resultado = await prisma.reserva.updateMany({
    where: {
      estado: "PENDIENTE",
      estadoPago: "PENDIENTE",
      creadoEn: { lt: limite },
    },
    data: { estado: "CANCELADA", estadoPago: "FALLIDO" },
  });

  return { expiradas: resultado.count };
}
