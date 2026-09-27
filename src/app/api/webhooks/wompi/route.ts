import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarFirmaEvento } from "@/lib/pagos/wompi";
import { procesarNotificacionesPendientes } from "@/lib/notificaciones/procesar";

// Webhook de eventos de Wompi ("transaction.updated"). Confirma o rechaza el
// pago de la sena de una reserva. Configurar esta URL en el dashboard de
// Wompi (Eventos) junto con WOMPI_EVENTS_SECRET en las variables de entorno.
export async function POST(request: NextRequest) {
  let body: {
    event?: string;
    data?: { transaction?: Record<string, unknown> };
    timestamp?: number;
    signature?: { checksum?: string; properties?: string[] };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  if (
    body.event !== "transaction.updated" ||
    !body.data?.transaction ||
    !body.signature?.checksum ||
    !body.signature?.properties ||
    typeof body.timestamp !== "number"
  ) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  const firmaValida = verificarFirmaEvento({
    event: body.event,
    data: { transaction: body.data.transaction },
    timestamp: body.timestamp,
    signature: { checksum: body.signature.checksum, properties: body.signature.properties },
  });

  if (!firmaValida) {
    return NextResponse.json({ error: "Firma invalida" }, { status: 401 });
  }

  const transaccion = body.data.transaction;
  const referencia = transaccion.reference;
  const estadoWompi = transaccion.status;
  const transaccionId = transaccion.id;

  if (typeof referencia !== "string" || typeof estadoWompi !== "string") {
    return NextResponse.json({ error: "Transaccion invalida" }, { status: 400 });
  }

  const reserva = await prisma.reserva.findUnique({
    where: { wompiReferencia: referencia },
    select: { id: true, estadoPago: true, clienteEmail: true },
  });

  // Referencia desconocida o evento ya procesado antes (Wompi puede
  // reintentar el mismo evento): responder 200 para que no siga reintentando.
  if (!reserva || reserva.estadoPago !== "PENDIENTE") {
    return NextResponse.json({ recibido: true });
  }

  if (estadoWompi === "APPROVED") {
    await prisma.$transaction(async (tx) => {
      await tx.reserva.update({
        where: { id: reserva.id },
        data: {
          estado: "CONFIRMADA",
          estadoPago: "PAGADO",
          wompiTransaccionId: typeof transaccionId === "string" ? transaccionId : undefined,
        },
      });
      await tx.notificacion.create({
        data: {
          reservaId: reserva.id,
          tipo: "CONFIRMACION",
          canal: "EMAIL",
          destinatario: reserva.clienteEmail,
        },
      });
    });

    try {
      await procesarNotificacionesPendientes(reserva.id);
    } catch (error) {
      console.error("Error procesando notificaciones:", error);
    }
  } else if (["DECLINED", "VOIDED", "ERROR"].includes(estadoWompi)) {
    await prisma.reserva.update({
      where: { id: reserva.id },
      data: {
        estado: "CANCELADA",
        estadoPago: "FALLIDO",
        wompiTransaccionId: typeof transaccionId === "string" ? transaccionId : undefined,
      },
    });
  }
  // Otros estados (ej. PENDING) no requieren accion: se espera el proximo evento.

  return NextResponse.json({ recibido: true });
}
