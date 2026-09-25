import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarNegocio } from "@/lib/permisos";
import { LIMITE_BARBEROS_GRATIS } from "@/lib/planes";

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
    select: { negocioId: true, activo: true },
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

  if (body.activo && !barbero.activo) {
    const negocio = await prisma.negocio.findUnique({
      where: { id: session.user.negocioId },
      select: { plan: true },
    });
    if (negocio?.plan === "GRATIS") {
      const cantidadActiva = await prisma.barbero.count({
        where: { negocioId: session.user.negocioId, activo: true },
      });
      if (cantidadActiva >= LIMITE_BARBEROS_GRATIS) {
        return NextResponse.json(
          {
            error: `El plan Gratis permite hasta ${LIMITE_BARBEROS_GRATIS} barbero activo. Actualizá a Pro para activar más.`,
          },
          { status: 403 },
        );
      }
    }
  }

  const actualizado = await prisma.barbero.update({
    where: { id },
    data: { activo: body.activo },
  });

  return NextResponse.json({ id: actualizado.id, activo: actualizado.activo });
}
