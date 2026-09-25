import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { puedeGestionarNegocio } from "@/lib/permisos";
import { calcularResumenReporte } from "@/lib/reportes";

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function haceDiasISO(dias: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || !puedeGestionarNegocio(session) || !session.user.negocioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde") ?? haceDiasISO(30);
  const hasta = searchParams.get("hasta") ?? hoyISO();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    return NextResponse.json(
      { error: "desde/hasta deben tener formato YYYY-MM-DD" },
      { status: 400 },
    );
  }

  if (desde > hasta) {
    return NextResponse.json({ error: "desde no puede ser posterior a hasta" }, { status: 400 });
  }

  const resumen = await calcularResumenReporte(session.user.negocioId, desde, hasta);
  return NextResponse.json(resumen);
}
