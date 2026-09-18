import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const reserva = await prisma.reserva.findUnique({
    where: { token },
    select: {
      id: true,
      barberoId: true,
      servicioId: true,
      fecha: true,
      hora: true,
      estado: true,
      clienteNombre: true,
      direccionCliente: true,
      barbero: { select: { nombre: true, negocio: { select: { nombre: true } } } },
      servicio: { select: { nombre: true, duracionMin: true, precio: true } },
    },
  });

  if (!reserva) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    barberoId: reserva.barberoId,
    servicioId: reserva.servicioId,
    fecha: reserva.fecha.toISOString().slice(0, 10),
    hora: reserva.hora,
    estado: reserva.estado,
    clienteNombre: reserva.clienteNombre,
    direccionCliente: reserva.direccionCliente,
    negocio: reserva.barbero.negocio.nombre,
    barbero: reserva.barbero.nombre,
    servicio: reserva.servicio.nombre,
    duracionMin: reserva.servicio.duracionMin,
    precio: reserva.servicio.precio.toString(),
  });
}
