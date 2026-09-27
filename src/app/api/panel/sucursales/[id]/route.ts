import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarNegocio } from "@/lib/permisos";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || !puedeGestionarNegocio(session) || !session.user.negocioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const sucursal = await prisma.sucursal.findUnique({
    where: { id },
    select: { negocioId: true },
  });

  if (!sucursal || sucursal.negocioId !== session.user.negocioId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  let body: { nombre?: string; direccion?: string; ciudad?: string; activo?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const data: { nombre?: string; direccion?: string; ciudad?: string; activo?: boolean } = {};
  if (typeof body.nombre === "string") data.nombre = body.nombre;
  if (typeof body.direccion === "string") data.direccion = body.direccion;
  if (typeof body.ciudad === "string") data.ciudad = body.ciudad;
  if (typeof body.activo === "boolean") data.activo = body.activo;

  const actualizado = await prisma.sucursal.update({ where: { id }, data });

  return NextResponse.json({
    id: actualizado.id,
    nombre: actualizado.nombre,
    direccion: actualizado.direccion,
    ciudad: actualizado.ciudad,
    activo: actualizado.activo,
  });
}
