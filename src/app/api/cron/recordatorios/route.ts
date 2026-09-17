import { NextRequest, NextResponse } from "next/server";
import { verificarCronSecret } from "@/lib/cron-auth";
import { generarRecordatorios } from "@/lib/notificaciones/recordatorios";

export async function GET(request: NextRequest) {
  const noAutorizado = verificarCronSecret(request);
  if (noAutorizado) return noAutorizado;

  const resultado = await generarRecordatorios();
  return NextResponse.json(resultado);
}
