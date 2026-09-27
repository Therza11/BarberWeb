import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const entrada = await prisma.listaEspera.findUnique({
    where: { token },
    select: {
      estado: true,
      fecha: true,
      clienteNombre: true,
      barbero: { select: { nombre: true, negocio: { select: { nombre: true, slug: true } } } },
      servicio: { select: { nombre: true } },
    },
  });

  if (!entrada) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    estado: entrada.estado,
    fecha: entrada.fecha.toISOString().slice(0, 10),
    clienteNombre: entrada.clienteNombre,
    negocio: entrada.barbero.negocio.nombre,
    negocioSlug: entrada.barbero.negocio.slug,
    barbero: entrada.barbero.nombre,
    servicio: entrada.servicio.nombre,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const entrada = await prisma.listaEspera.findUnique({
    where: { token },
    select: { id: true, estado: true },
  });

  if (!entrada) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (entrada.estado === "CANCELADA") {
    return NextResponse.json({ estado: "CANCELADA" });
  }

  const actualizado = await prisma.listaEspera.update({
    where: { id: entrada.id },
    data: { estado: "CANCELADA" },
  });

  return NextResponse.json({ estado: actualizado.estado });
}
