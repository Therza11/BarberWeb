import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { SlotNoDisponibleError, crearReserva, parseFechaColumna } from "@/lib/reservas";

type ReservaInput = {
  barberoId: string;
  servicioId: string;
  fecha: string; // "YYYY-MM-DD"
  hora: string; // "HH:mm"
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  direccionCliente?: string;
};

export async function POST(request: NextRequest) {
  let body: Partial<ReservaInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const {
    barberoId,
    servicioId,
    fecha,
    hora,
    clienteNombre,
    clienteTelefono,
    clienteEmail,
    direccionCliente,
  } = body;

  if (
    !barberoId ||
    !servicioId ||
    !fecha ||
    !hora ||
    !clienteNombre ||
    !clienteTelefono ||
    !clienteEmail
  ) {
    return NextResponse.json(
      {
        error:
          "Faltan campos requeridos: barberoId, servicioId, fecha, hora, clienteNombre, clienteTelefono, clienteEmail",
      },
      { status: 400 },
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
    return NextResponse.json(
      { error: "fecha debe ser YYYY-MM-DD y hora debe ser HH:mm" },
      { status: 400 },
    );
  }

  try {
    const reserva = await crearReserva({
      barberoId,
      servicioId,
      fecha: parseFechaColumna(fecha),
      hora,
      clienteNombre,
      clienteTelefono,
      clienteEmail,
      direccionCliente,
    });

    return NextResponse.json(
      {
        id: reserva.id,
        token: reserva.token,
        estado: reserva.estado,
        estadoPago: reserva.estadoPago,
        montoSena: reserva.montoSena,
        pagoUrl: reserva.pagoUrl,
        fecha,
        hora: reserva.hora,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SlotNoDisponibleError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "El horario ya no esta disponible" },
        { status: 409 },
      );
    }
    throw error;
  }
}
