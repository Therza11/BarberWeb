import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function verificarPropietario(id: string, barberoId: string) {
  const disponibilidad = await prisma.disponibilidad.findUnique({
    where: { id },
    select: { barberoId: true },
  });
  return disponibilidad?.barberoId === barberoId;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || session.user.role !== "BARBERO" || !session.user.barberoId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  if (!(await verificarPropietario(id, session.user.barberoId))) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
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

  const actualizada = await prisma.disponibilidad.update({
    where: { id },
    data: { activo: body.activo },
  });

  return NextResponse.json(actualizada);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || session.user.role !== "BARBERO" || !session.user.barberoId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  if (!(await verificarPropietario(id, session.user.barberoId))) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  await prisma.disponibilidad.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
