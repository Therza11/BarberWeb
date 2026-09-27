import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseFechaColumna } from "@/lib/reservas";

type ListaEsperaInput = {
  barberoId: string;
  servicioId: string;
  fecha: string; // "YYYY-MM-DD"
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
};

export async function POST(request: NextRequest) {
  let body: Partial<ListaEsperaInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { barberoId, servicioId, fecha, clienteNombre, clienteTelefono, clienteEmail } = body;

  if (!barberoId || !servicioId || !fecha || !clienteNombre || !clienteTelefono || !clienteEmail) {
    return NextResponse.json(
      {
        error:
          "Faltan campos requeridos: barberoId, servicioId, fecha, clienteNombre, clienteTelefono, clienteEmail",
      },
      { status: 400 },
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "fecha debe ser YYYY-MM-DD" }, { status: 400 });
  }

  const [barbero, servicio] = await Promise.all([
    prisma.barbero.findUnique({ where: { id: barberoId }, select: { activo: true } }),
    prisma.servicio.findUnique({ where: { id: servicioId }, select: { activo: true } }),
  ]);

  if (!barbero || !barbero.activo) {
    return NextResponse.json({ error: "Barbero no encontrado" }, { status: 404 });
  }
  if (!servicio || !servicio.activo) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  }

  const entrada = await prisma.listaEspera.create({
    data: {
      barberoId,
      servicioId,
      fecha: parseFechaColumna(fecha),
      clienteNombre,
      clienteTelefono,
      clienteEmail,
    },
  });

  return NextResponse.json({ token: entrada.token }, { status: 201 });
}
