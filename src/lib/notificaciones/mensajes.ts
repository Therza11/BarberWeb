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

function obtenerAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.NODE_ENV === "production") {
    // Fallar fuerte en vez de mandar links a localhost a clientes reales
    // sin ningun aviso visible.
    throw new Error(
      "APP_URL no esta configurada en produccion: no se puede armar el link de la notificacion",
    );
  }
  return "http://localhost:3000";
}

export function armarMensaje(tipo: TipoNotificacion, r: DatosReserva): string {
  switch (tipo) {
    case "CONFIRMACION": {
      const link = `${obtenerAppUrl()}/reserva/${r.token}`;
      return `Hola ${r.clienteNombre}! Tu turno en ${r.negocio} con ${r.barbero} (${r.servicio}) quedo confirmado para el ${r.fecha} a las ${r.hora}. Para cancelar o reprogramar: ${link}`;
    }
    case "CANCELACION":
      return `Hola ${r.clienteNombre}, tu turno en ${r.negocio} del ${r.fecha} a las ${r.hora} fue cancelado.`;
    case "RECORDATORIO":
      return `Hola ${r.clienteNombre}! Te recordamos tu turno manana ${r.fecha} a las ${r.hora} en ${r.negocio} con ${r.barbero} (${r.servicio}).`;
  }
}
