const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL;

export async function enviarEmail(destinatario: string, asunto: string, mensaje: string) {
  if (!API_KEY || !FROM) {
    console.log(`[email:simulado] a ${destinatario} (${asunto}): ${mensaje}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: destinatario,
      subject: asunto,
      text: mensaje,
    }),
  });

  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Resend API respondio ${res.status}: ${detalle}`);
  }
}
