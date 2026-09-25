import { NextRequest, NextResponse } from "next/server";
import { verificarCronSecret } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";

// Ruta protegida para que el operador de la plataforma cambie el plan de un
// negocio a mano, mientras no haya una pasarela de pago integrada (el cobro
// del plan Pro se hace por fuera del sitio por ahora).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const noAutorizado = verificarCronSecret(request);
  if (noAutorizado) return noAutorizado;

  const { slug } = await params;

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  if (body.plan !== "GRATIS" && body.plan !== "PRO") {
    return NextResponse.json({ error: "plan debe ser GRATIS o PRO" }, { status: 400 });
  }

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const actualizado = await prisma.negocio.update({
    where: { slug },
    data: { plan: body.plan },
  });

  return NextResponse.json({ slug: actualizado.slug, plan: actualizado.plan });
}
