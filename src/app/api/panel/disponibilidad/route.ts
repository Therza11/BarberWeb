import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarTurnos } from "@/lib/permisos";

export async function GET() {
  const session = await auth();
  if (!session || !puedeGestionarTurnos(session) || !session.user.barberoId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const disponibilidades = await prisma.disponibilidad.findMany({
    where: { barberoId: session.user.barberoId },
    orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
  });

  return NextResponse.json(disponibilidades);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !puedeGestionarTurnos(session) || !session.user.barberoId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { diaSemana?: number; horaInicio?: string; horaFin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { diaSemana, horaInicio, horaFin } = body;

  if (
    typeof diaSemana !== "number" ||
    diaSemana < 0 ||
    diaSemana > 6 ||
    !horaInicio ||
    !horaFin ||
    !/^\d{2}:\d{2}$/.test(horaInicio) ||
    !/^\d{2}:\d{2}$/.test(horaFin) ||
    horaInicio >= horaFin
  ) {
    return NextResponse.json(
      {
        error:
          "diaSemana debe ser 0-6, horaInicio/horaFin en formato HH:mm, y horaInicio debe ser menor a horaFin",
      },
      { status: 400 },
    );
  }

  const disponibilidad = await prisma.disponibilidad.create({
    data: {
      barberoId: session.user.barberoId,
      diaSemana,
      horaInicio,
      horaFin,
    },
  });

  return NextResponse.json(disponibilidad, { status: 201 });
}
