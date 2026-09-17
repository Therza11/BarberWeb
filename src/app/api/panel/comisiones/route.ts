import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarNegocio } from "@/lib/permisos";

export async function GET() {
  const session = await auth();
  if (!session || !puedeGestionarNegocio(session) || !session.user.negocioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const comisiones = await prisma.comision.findMany({
    where: { barbero: { negocioId: session.user.negocioId } },
    include: {
      barbero: { select: { nombre: true } },
      servicio: { select: { nombre: true } },
    },
    orderBy: [{ barbero: { nombre: "asc" } }, { servicio: { nombre: "asc" } }],
  });

  return NextResponse.json(
    comisiones.map((c) => ({
      id: c.id,
      barberoId: c.barberoId,
      barbero: c.barbero.nombre,
      servicioId: c.servicioId,
      servicio: c.servicio.nombre,
      porcentaje: c.porcentaje?.toString() ?? null,
      montoFijo: c.montoFijo?.toString() ?? null,
    })),
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !puedeGestionarNegocio(session) || !session.user.negocioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: {
    barberoId?: string;
    servicioId?: string;
    porcentaje?: number;
    montoFijo?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { barberoId, servicioId, porcentaje, montoFijo } = body;

  if (!barberoId || !servicioId || (porcentaje == null && montoFijo == null)) {
    return NextResponse.json(
      {
        error:
          "Faltan campos requeridos: barberoId, servicioId, y porcentaje o montoFijo",
      },
      { status: 400 },
    );
  }

  if (porcentaje != null && (porcentaje < 0 || porcentaje > 100)) {
    return NextResponse.json(
      { error: "porcentaje debe estar entre 0 y 100" },
      { status: 400 },
    );
  }

  const [barbero, servicio] = await Promise.all([
    prisma.barbero.findUnique({ where: { id: barberoId }, select: { negocioId: true } }),
    prisma.servicio.findUnique({ where: { id: servicioId }, select: { negocioId: true } }),
  ]);

  if (
    !barbero ||
    !servicio ||
    barbero.negocioId !== session.user.negocioId ||
    servicio.negocioId !== session.user.negocioId
  ) {
    return NextResponse.json(
      { error: "Barbero o servicio no pertenecen a tu negocio" },
      { status: 403 },
    );
  }

  const comision = await prisma.comision.upsert({
    where: { barberoId_servicioId: { barberoId, servicioId } },
    update: {
      porcentaje: porcentaje ?? null,
      montoFijo: montoFijo ?? null,
    },
    create: {
      barberoId,
      servicioId,
      porcentaje: porcentaje ?? null,
      montoFijo: montoFijo ?? null,
    },
  });

  return NextResponse.json(
    {
      id: comision.id,
      porcentaje: comision.porcentaje?.toString() ?? null,
      montoFijo: comision.montoFijo?.toString() ?? null,
    },
    { status: 201 },
  );
}
