import { NextRequest, NextResponse } from "next/server";
import { obtenerSlotsLibres, parseFechaColumna } from "@/lib/reservas";

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

  const resultado = await obtenerSlotsLibres({
    barberoId,
    servicioId,
    fecha: parseFechaColumna(fechaStr),
  });

  if ("error" in resultado) {
    return NextResponse.json({ error: resultado.error }, { status: 404 });
  }

  return NextResponse.json({ fecha: fechaStr, slots: resultado.slots });
}
