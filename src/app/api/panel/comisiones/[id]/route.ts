import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarNegocio } from "@/lib/permisos";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || !puedeGestionarNegocio(session) || !session.user.negocioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const comision = await prisma.comision.findUnique({
    where: { id },
    select: { barbero: { select: { negocioId: true } } },
  });

  if (!comision || comision.barbero.negocioId !== session.user.negocioId) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  await prisma.comision.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
