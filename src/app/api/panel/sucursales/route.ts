import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarNegocio } from "@/lib/permisos";
import { puedeUsarSucursales } from "@/lib/planes";

export async function GET() {
  const session = await auth();
  if (!session || !puedeGestionarNegocio(session) || !session.user.negocioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sucursales = await prisma.sucursal.findMany({
    where: { negocioId: session.user.negocioId },
    select: { id: true, nombre: true, direccion: true, ciudad: true, activo: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(sucursales);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !puedeGestionarNegocio(session) || !session.user.negocioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const negocio = await prisma.negocio.findUnique({
    where: { id: session.user.negocioId },
    select: { plan: true },
  });

  if (!negocio || !puedeUsarSucursales(negocio.plan)) {
    return NextResponse.json(
      { error: "Multi-sucursal es una funcion del plan Pro. Actualizá tu plan para agregar sedes." },
      { status: 403 },
    );
  }

  let body: { nombre?: string; direccion?: string; ciudad?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { nombre, direccion, ciudad } = body;

  if (!nombre) {
    return NextResponse.json({ error: "Falta el campo requerido: nombre" }, { status: 400 });
  }

  const sucursal = await prisma.sucursal.create({
    data: { negocioId: session.user.negocioId, nombre, direccion, ciudad },
  });

  return NextResponse.json(
    { id: sucursal.id, nombre: sucursal.nombre, direccion: sucursal.direccion, ciudad: sucursal.ciudad },
    { status: 201 },
  );
}
