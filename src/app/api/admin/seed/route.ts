import { NextRequest, NextResponse } from "next/server";
import { verificarCronSecret } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { seedDemoData } from "@/lib/seed-demo";

// Ruta protegida para cargar datos de demo (negocio/barbero de ejemplo) en
// un entorno recien desplegado, ya que no hay todavia un flujo de alta
// self-service (Fase 7). Reutiliza el mismo secreto que los cron jobs.
export async function GET(request: NextRequest) {
  const noAutorizado = verificarCronSecret(request);
  if (noAutorizado) return noAutorizado;

  const resultado = await seedDemoData(prisma);
  return NextResponse.json(resultado);
}
