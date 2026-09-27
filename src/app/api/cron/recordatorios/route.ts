import { NextRequest, NextResponse } from "next/server";
import { verificarCronSecret } from "@/lib/cron-auth";
import { generarRecordatorios } from "@/lib/notificaciones/recordatorios";
import { expirarReservasPendientesDePago } from "@/lib/pagos/expirar";

export async function GET(request: NextRequest) {
  const noAutorizado = verificarCronSecret(request);
  if (noAutorizado) return noAutorizado;

  const [recordatorios, pagosExpirados] = await Promise.all([
    generarRecordatorios(),
    expirarReservasPendientesDePago(),
  ]);

  return NextResponse.json({ ...recordatorios, ...pagosExpirados });
}
