import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarNegocio } from "@/lib/permisos";
import { LIMITE_BARBEROS_GRATIS } from "@/lib/planes";

export async function GET() {
  const session = await auth();
  if (!session || !puedeGestionarNegocio(session) || !session.user.negocioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const barberos = await prisma.barbero.findMany({
    where: { negocioId: session.user.negocioId },
    select: { id: true, nombre: true, email: true, telefono: true, activo: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(barberos);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !puedeGestionarNegocio(session) || !session.user.negocioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { nombre?: string; email?: string; password?: string; telefono?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { nombre, email, password, telefono } = body;

  if (!nombre || !email || !password) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: nombre, email, password" },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres" },
      { status: 400 },
    );
  }

  const negocio = await prisma.negocio.findUnique({
    where: { id: session.user.negocioId },
    select: { plan: true },
  });

  if (negocio?.plan === "GRATIS") {
    const cantidadActual = await prisma.barbero.count({
      where: { negocioId: session.user.negocioId, activo: true },
    });
    if (cantidadActual >= LIMITE_BARBEROS_GRATIS) {
      return NextResponse.json(
        {
          error: `El plan Gratis permite hasta ${LIMITE_BARBEROS_GRATIS} barbero activo. Actualizá a Pro para agregar más.`,
        },
        { status: 403 },
      );
    }
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const barbero = await prisma.barbero.create({
      data: {
        negocioId: session.user.negocioId,
        nombre,
        email,
        passwordHash,
        telefono,
      },
    });

    return NextResponse.json(
      { id: barbero.id, nombre: barbero.nombre, email: barbero.email },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un barbero registrado con ese email" },
        { status: 409 },
      );
    }
    throw error;
  }
}
