import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "NEGOCIO" || !session.user.negocioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const negocio = await prisma.negocio.findUnique({
    where: { id: session.user.negocioId },
    select: {
      nombre: true,
      barberos: { where: { activo: true }, select: { id: true, nombre: true } },
      servicios: { where: { activo: true }, select: { id: true, nombre: true } },
    },
  });

  return NextResponse.json(negocio);
}
