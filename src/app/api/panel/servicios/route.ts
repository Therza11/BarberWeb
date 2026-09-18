import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarNegocio } from "@/lib/permisos";

export async function GET() {
  const session = await auth();
  if (!session || !puedeGestionarNegocio(session) || !session.user.negocioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const servicios = await prisma.servicio.findMany({
    where: { negocioId: session.user.negocioId },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(
    servicios.map((s) => ({ ...s, precio: s.precio.toString() })),
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !puedeGestionarNegocio(session) || !session.user.negocioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: {
    nombre?: string;
    descripcion?: string;
    duracionMin?: number;
    precio?: number;
    aDomicilio?: boolean;
    tiempoTrasladoMin?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { nombre, descripcion, duracionMin, precio, aDomicilio, tiempoTrasladoMin } = body;

  if (!nombre || !duracionMin || duracionMin <= 0 || precio == null || precio < 0) {
    return NextResponse.json(
      {
        error:
          "Faltan campos requeridos: nombre, duracionMin (> 0), precio (>= 0)",
      },
      { status: 400 },
    );
  }

  if (aDomicilio && (!tiempoTrasladoMin || tiempoTrasladoMin <= 0)) {
    return NextResponse.json(
      { error: "Un servicio a domicilio necesita tiempoTrasladoMin (> 0)" },
      { status: 400 },
    );
  }

  const servicio = await prisma.servicio.create({
    data: {
      negocioId: session.user.negocioId,
      nombre,
      descripcion,
      duracionMin,
      precio,
      aDomicilio: Boolean(aDomicilio),
      tiempoTrasladoMin: aDomicilio ? tiempoTrasladoMin : undefined,
    },
  });

  return NextResponse.json(
    { ...servicio, precio: servicio.precio.toString() },
    { status: 201 },
  );
}
