const API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export async function enviarWhatsapp(destinatario: string, mensaje: string) {
  if (!API_TOKEN || !PHONE_NUMBER_ID) {
    console.log(`[whatsapp:simulado] a ${destinatario}: ${mensaje}`);
    return;
  }

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: destinatario,
        type: "text",
        text: { body: mensaje },
      }),
    },
  );

  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`WhatsApp API respondio ${res.status}: ${detalle}`);
  }
}
