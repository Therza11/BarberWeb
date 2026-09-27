import { createHash } from "crypto";

// Integracion con Wompi (Bancolombia/Nequi, Colombia) via su Web Checkout
// hospedado - no requiere widget JS ni SDK, solo armar una URL firmada y
// verificar la firma de los eventos que Wompi manda por webhook.
// Docs de referencia (verificar contra el dashboard antes de ir a produccion,
// las claves y el algoritmo de firma pueden cambiar de version):
// https://docs.wompi.co/docs/colombia/widget-checkout-web/
// https://docs.wompi.co/docs/colombia/eventos/
//
// Diseno: UNA sola cuenta de Wompi para toda la plataforma (no una por
// negocio). El negocio activa "requiereSena" y la plataforma cobra el
// deposito; la liquidacion a cada barberia se maneja fuera del sitio, igual
// que las comisiones de barbero (ver src/lib/reportes.ts). Onboardear una
// cuenta de Wompi por cada barberia (KYC individual) seria mucha friccion
// para una funcion de este tamano.

const PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY;
const INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET;
const EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET;
const AMBIENTE = process.env.WOMPI_ENV === "production" ? "production" : "sandbox";

const CHECKOUT_BASE_URL = "https://checkout.wompi.co/p/";

// Si no hay claves configuradas, el pago se simula (igual que WhatsApp/Resend
// sin credenciales): la reserva se confirma directo sin pasar por Wompi, asi
// el flujo se puede probar en local/demo sin una cuenta real.
export function wompiConfigurado(): boolean {
  return Boolean(PUBLIC_KEY && INTEGRITY_SECRET);
}

// Ventana de gracia para pagos iniciados y no completados: pasado este
// tiempo, una reserva PENDIENTE con estadoPago PENDIENTE deja de contar como
// "ocupada" al calcular disponibilidad (aunque el cron diario recien la
// marque CANCELADA mas tarde - ver src/lib/pagos/expirar.ts). Necesario
// porque Vercel Hobby solo permite cron una vez al dia, muy poco frecuente
// para liberar el slot a tiempo si dependiera solo del cron.
export const SENA_EXPIRACION_MIN = 30;

export function calcularMontoSena(precio: number, senaPorcentaje: number): number {
  return Math.round(precio * (senaPorcentaje / 100) * 100) / 100;
}

export function construirUrlCheckout(params: {
  referencia: string;
  montoEnCentavos: number;
  redirectUrl: string;
  nombreCliente: string;
  emailCliente: string;
}): string | null {
  if (!PUBLIC_KEY || !INTEGRITY_SECRET) return null;

  const { referencia, montoEnCentavos, redirectUrl, nombreCliente, emailCliente } = params;
  const currency = "COP";

  // Firma de integridad: sha256("<reference><amount-in-cents><currency><secret>")
  const firma = createHash("sha256")
    .update(`${referencia}${montoEnCentavos}${currency}${INTEGRITY_SECRET}`)
    .digest("hex");

  const url = new URL(CHECKOUT_BASE_URL);
  url.searchParams.set("public-key", PUBLIC_KEY);
  url.searchParams.set("currency", currency);
  url.searchParams.set("amount-in-cents", String(montoEnCentavos));
  url.searchParams.set("reference", referencia);
  url.searchParams.set("signature:integrity", firma);
  url.searchParams.set("redirect-url", redirectUrl);
  url.searchParams.set("customer-data:full-name", nombreCliente);
  url.searchParams.set("customer-data:email", emailCliente);

  return url.toString();
}

type EventoWompi = {
  event: string;
  data: { transaction: Record<string, unknown> };
  timestamp: number;
  signature: { checksum: string; properties: string[] };
};

function leerPropiedad(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

// Verifica el checksum que Wompi manda en cada evento de webhook, para
// confirmar que la notificacion realmente viene de Wompi y no fue
// falsificada. Algoritmo: sha256 de la concatenacion de los valores de
// `signature.properties` (en ese orden, leidos de `data`) + `timestamp` +
// el secreto de eventos del dashboard de Wompi.
export function verificarFirmaEvento(evento: EventoWompi): boolean {
  if (!EVENTS_SECRET) return false;

  const valores = evento.signature.properties
    .map((prop) => leerPropiedad({ transaction: evento.data.transaction }, prop))
    .join("");

  const checksumEsperado = createHash("sha256")
    .update(`${valores}${evento.timestamp}${EVENTS_SECRET}`)
    .digest("hex");

  return checksumEsperado.toLowerCase() === evento.signature.checksum.toLowerCase();
}

export function eventosConfigurados(): boolean {
  return Boolean(EVENTS_SECRET);
}

export const WOMPI_AMBIENTE = AMBIENTE;
