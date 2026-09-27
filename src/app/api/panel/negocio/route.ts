import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarNegocio } from "@/lib/permisos";
import { puedeUsarDominioPropio, puedeUsarSena } from "@/lib/planes";

export async function GET() {
  const session = await auth();
  if (!session || !puedeGestionarNegocio(session) || !session.user.negocioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const negocio = await prisma.negocio.findUnique({
    where: { id: session.user.negocioId },
    select: {
      nombre: true,
      plan: true,
      dominioPersonalizado: true,
      requiereSena: true,
      senaPorcentaje: true,
      barberos: { where: { activo: true }, select: { id: true, nombre: true } },
      servicios: { where: { activo: true }, select: { id: true, nombre: true } },
    },
  });

  return NextResponse.json(
    negocio && { ...negocio, senaPorcentaje: negocio.senaPorcentaje?.toString() ?? null },
  );
}

// Ajustes de dominio propio y sena, ambos features de plan Pro. El resto de
// los campos del negocio (nombre, direccion, etc.) no se edita desde aca.
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session || !puedeGestionarNegocio(session) || !session.user.negocioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: {
    dominioPersonalizado?: string | null;
    requiereSena?: boolean;
    senaPorcentaje?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const negocio = await prisma.negocio.findUnique({
    where: { id: session.user.negocioId },
    select: { plan: true, requiereSena: true, senaPorcentaje: true },
  });
  if (!negocio) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const data: Prisma.NegocioUpdateInput = {};

  if (body.dominioPersonalizado !== undefined) {
    if (!puedeUsarDominioPropio(negocio.plan)) {
      return NextResponse.json(
        { error: "Dominio propio es una funcion del plan Pro." },
        { status: 403 },
      );
    }
    if (body.dominioPersonalizado === null || body.dominioPersonalizado === "") {
      data.dominioPersonalizado = null;
    } else {
      const dominio = body.dominioPersonalizado.trim().toLowerCase();
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(dominio)) {
        return NextResponse.json({ error: "El dominio no tiene un formato valido" }, { status: 400 });
      }
      data.dominioPersonalizado = dominio;
    }
  }

  if (body.requiereSena !== undefined || body.senaPorcentaje !== undefined) {
    if (!puedeUsarSena(negocio.plan)) {
      return NextResponse.json(
        { error: "La sena con Wompi es una funcion del plan Pro." },
        { status: 403 },
      );
    }
  }

  if (body.requiereSena !== undefined) {
    if (typeof body.requiereSena !== "boolean") {
      return NextResponse.json({ error: "requiereSena debe ser boolean" }, { status: 400 });
    }
    data.requiereSena = body.requiereSena;
  }

  if (body.senaPorcentaje !== undefined) {
    if (body.senaPorcentaje !== null) {
      if (
        typeof body.senaPorcentaje !== "number" ||
        body.senaPorcentaje < 1 ||
        body.senaPorcentaje > 100
      ) {
        return NextResponse.json(
          { error: "senaPorcentaje debe ser un numero entre 1 y 100" },
          { status: 400 },
        );
      }
    }
    data.senaPorcentaje = body.senaPorcentaje;
  }

  const efectivoRequiereSena = body.requiereSena ?? negocio.requiereSena;
  const efectivoSenaPorcentaje =
    body.senaPorcentaje !== undefined ? body.senaPorcentaje : negocio.senaPorcentaje;
  if (efectivoRequiereSena && efectivoSenaPorcentaje === null) {
    return NextResponse.json(
      { error: "Falta definir senaPorcentaje para poder pedir sena" },
      { status: 400 },
    );
  }

  try {
    const actualizado = await prisma.negocio.update({
      where: { id: session.user.negocioId },
      data,
    });
    return NextResponse.json({
      dominioPersonalizado: actualizado.dominioPersonalizado,
      requiereSena: actualizado.requiereSena,
      senaPorcentaje: actualizado.senaPorcentaje?.toString() ?? null,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Ese dominio ya esta en uso por otro negocio" },
        { status: 409 },
      );
    }
    throw error;
  }
}
