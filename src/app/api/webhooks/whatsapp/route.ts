import { NextRequest, NextResponse } from "next/server";
import { procesarMensajeWhatsapp } from "@/lib/whatsapp-bot";
import { enviarWhatsapp } from "@/lib/notificaciones/whatsapp";

// Verificacion del webhook (Meta la llama una vez al configurar la URL en el
// dashboard de WhatsApp Cloud API: Configuration -> Webhooks).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const modo = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (modo === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "Verificacion invalida" }, { status: 403 });
}

type MensajeEntrante = {
  from: string;
  type: string;
  text?: { body: string };
};

type WebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: { messages?: MensajeEntrante[] };
      field?: string;
    }>;
  }>;
};

// Eventos de mensajes entrantes. Responde 200 siempre y rapido (Meta
// reintenta/deshabilita el webhook si tarda o falla) - cualquier error de
// procesamiento se loguea, nunca se lo devolvemos a Meta como 5xx.
export async function POST(request: NextRequest) {
  let body: WebhookPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ recibido: true });
  }

  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const mensaje of change.value?.messages ?? []) {
          if (mensaje.type !== "text" || !mensaje.text?.body) {
            await enviarWhatsapp(
              mensaje.from,
              "Por ahora solo puedo leer mensajes de texto. Escribime el nombre de la barbería donde querés reservar.",
            );
            continue;
          }
          await procesarMensajeWhatsapp(mensaje.from, mensaje.text.body);
        }
      }
    }
  } catch (error) {
    console.error("Error procesando webhook de WhatsApp:", error);
  }

  return NextResponse.json({ recibido: true });
}
