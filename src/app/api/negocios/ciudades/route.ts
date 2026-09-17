import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ciudades = await prisma.negocio.findMany({
    where: { activo: true, ciudad: { not: null } },
    select: { ciudad: true },
    distinct: ["ciudad"],
    orderBy: { ciudad: "asc" },
  });

  return NextResponse.json(ciudades.map((c) => c.ciudad));
}
