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

  const barbero = await prisma.barbero.findUnique({
    where: { id },
    select: { negocioId: true },
  });

  if (!barbero || barbero.negocioId !== session.user.negocioId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  let body: { activo?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  if (typeof body.activo !== "boolean") {
    return NextResponse.json({ error: "activo debe ser boolean" }, { status: 400 });
  }

  const actualizado = await prisma.barbero.update({
    where: { id },
    data: { activo: body.activo },
  });

  return NextResponse.json({ id: actualizado.id, activo: actualizado.activo });
}
