import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// El cliente nunca tiene cuenta: el token de su propia reserva es la unica
// prueba de que el servicio ocurrio, asi que es lo unico que se pide para
// dejar una resena. Solo se permite sobre una reserva COMPLETADA y una vez
// por reserva (constraint unique en Resena.reservaId).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let body: { calificacion?: number; comentario?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { calificacion, comentario } = body;

  if (
    typeof calificacion !== "number" ||
    !Number.isInteger(calificacion) ||
    calificacion < 1 ||
    calificacion > 5
  ) {
    return NextResponse.json(
      { error: "calificacion debe ser un entero entre 1 y 5" },
      { status: 400 },
    );
  }

  const reserva = await prisma.reserva.findUnique({
    where: { token },
    select: { id: true, barberoId: true, estado: true },
  });

  if (!reserva) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }

  if (reserva.estado !== "COMPLETADA") {
    return NextResponse.json(
      { error: "Solo se puede calificar un turno completado" },
      { status: 409 },
    );
  }

  try {
    const resena = await prisma.resena.create({
      data: {
        reservaId: reserva.id,
        barberoId: reserva.barberoId,
        calificacion,
        comentario: comentario?.trim() || undefined,
      },
    });

    return NextResponse.json(
      { calificacion: resena.calificacion, comentario: resena.comentario },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya calificaste este turno" }, { status: 409 });
    }
    throw error;
  }
}
