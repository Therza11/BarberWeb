import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularSlotsLibres } from "@/lib/horarios";

// Interpreta "YYYY-MM-DD" como fecha local (sin desplazamiento de zona horaria)
// y devuelve tanto el Date (medianoche UTC, como se guarda en la columna @db.Date)
// como el dia de la semana (0=Domingo..6=Sabado) segun esa fecha calendario.
function parseFecha(fechaStr: string): { fecha: Date; diaSemana: number } {
  const [anio, mes, dia] = fechaStr.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const diaSemana = fecha.getUTCDay();
  return { fecha, diaSemana };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const barberoId = searchParams.get("barberoId");
  const servicioId = searchParams.get("servicioId");
  const fechaStr = searchParams.get("fecha");

  if (!barberoId || !servicioId || !fechaStr) {
    return NextResponse.json(
      { error: "Faltan parametros: barberoId, servicioId, fecha" },
      { status: 400 },
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    return NextResponse.json(
      { error: "El parametro fecha debe tener formato YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const servicio = await prisma.servicio.findUnique({
    where: { id: servicioId },
    select: { duracionMin: true, activo: true },
  });

  if (!servicio || !servicio.activo) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  }

  const { fecha, diaSemana } = parseFecha(fechaStr);

  const [ventanas, reservasActivas] = await Promise.all([
    prisma.disponibilidad.findMany({
      where: { barberoId, diaSemana, activo: true },
      select: { horaInicio: true, horaFin: true },
    }),
    prisma.reserva.findMany({
      where: {
        barberoId,
        fecha,
        estado: { in: ["PENDIENTE", "CONFIRMADA"] },
      },
      select: { hora: true, servicio: { select: { duracionMin: true } } },
    }),
  ]);

  const ocupadas = reservasActivas.map((r) => ({
    hora: r.hora,
    duracionMin: r.servicio.duracionMin,
  }));

  const slots = calcularSlotsLibres(ventanas, ocupadas, servicio.duracionMin);

  return NextResponse.json({ fecha: fechaStr, slots });
}
