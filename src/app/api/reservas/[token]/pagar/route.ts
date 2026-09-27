import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerAppUrl } from "@/lib/notificaciones/mensajes";
import { construirUrlCheckout, wompiConfigurado } from "@/lib/pagos/wompi";

// Re-genera el link de pago de Wompi para una reserva cuya sena quedo
// PENDIENTE (ej. el cliente cerro la pestaña antes de completar el pago).
// Idempotente: usa la misma referencia/monto ya guardados en la reserva.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const reserva = await prisma.reserva.findUnique({
    where: { token },
    select: {
      id: true,
      estado: true,
      estadoPago: true,
      montoSena: true,
      wompiReferencia: true,
      clienteNombre: true,
      clienteEmail: true,
    },
  });

  if (!reserva) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }

  if (
    reserva.estado !== "PENDIENTE" ||
    reserva.estadoPago !== "PENDIENTE" ||
    !reserva.wompiReferencia ||
    !reserva.montoSena
  ) {
    return NextResponse.json(
      { error: "Esta reserva no tiene un pago pendiente" },
      { status: 400 },
    );
  }

  if (!wompiConfigurado()) {
    return NextResponse.json({ error: "Wompi no esta configurado" }, { status: 503 });
  }

  const pagoUrl = construirUrlCheckout({
    referencia: reserva.wompiReferencia,
    montoEnCentavos: Math.round(Number(reserva.montoSena) * 100),
    redirectUrl: `${obtenerAppUrl()}/reserva/${token}`,
    nombreCliente: reserva.clienteNombre,
    emailCliente: reserva.clienteEmail,
  });

  return NextResponse.json({ pagoUrl });
}
