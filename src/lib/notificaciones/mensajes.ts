import type { TipoNotificacion } from "@/generated/prisma/client";

type DatosReserva = {
  clienteNombre: string;
  negocio: string;
  barbero: string;
  servicio: string;
  fecha: string;
  hora: string;
  token: string;
};

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export function armarMensaje(tipo: TipoNotificacion, r: DatosReserva): string {
  const link = `${APP_URL}/reserva/${r.token}`;

  switch (tipo) {
    case "CONFIRMACION":
      return `Hola ${r.clienteNombre}! Tu turno en ${r.negocio} con ${r.barbero} (${r.servicio}) quedo confirmado para el ${r.fecha} a las ${r.hora}. Para cancelar o reprogramar: ${link}`;
    case "CANCELACION":
      return `Hola ${r.clienteNombre}, tu turno en ${r.negocio} del ${r.fecha} a las ${r.hora} fue cancelado.`;
    case "RECORDATORIO":
      return `Hola ${r.clienteNombre}! Te recordamos tu turno manana ${r.fecha} a las ${r.hora} en ${r.negocio} con ${r.barbero} (${r.servicio}).`;
  }
}
