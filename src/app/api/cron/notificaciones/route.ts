import { NextRequest, NextResponse } from "next/server";
import { verificarCronSecret } from "@/lib/cron-auth";
import { procesarNotificacionesPendientes } from "@/lib/notificaciones/procesar";

export async function GET(request: NextRequest) {
  const noAutorizado = verificarCronSecret(request);
  if (noAutorizado) return noAutorizado;

  const resultado = await procesarNotificacionesPendientes();
  return NextResponse.json(resultado);
}
