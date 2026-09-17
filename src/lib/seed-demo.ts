import type { PrismaClient } from "@/generated/prisma/client";
import bcrypt from "bcryptjs";

// Credenciales de prueba SOLO para desarrollo/demo.
export const PASSWORD_DEMO = "demo1234";

export async function seedDemoData(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 10);

  const negocio = await prisma.negocio.upsert({
    where: { slug: "barberia-central" },
    update: { ciudad: "Buenos Aires" },
    create: {
      nombre: "Barbería Central",
      slug: "barberia-central",
      telefono: "+54 9 11 5555-5555",
      email: "contacto@barberiacentral.com",
      passwordHash,
      direccion: "Av. Siempre Viva 123",
      ciudad: "Buenos Aires",
    },
  });

  const barbero = await prisma.barbero.upsert({
    where: { id: "seed-barbero-juan" },
    update: {},
    create: {
      id: "seed-barbero-juan",
      negocioId: negocio.id,
      nombre: "Juan Pérez",
      email: "juan@barberiacentral.com",
      passwordHash,
      telefono: "+54 9 11 4444-4444",
    },
  });

  const corteClasico = await prisma.servicio.upsert({
    where: { id: "seed-servicio-corte" },
    update: {},
    create: {
      id: "seed-servicio-corte",
      negocioId: negocio.id,
      nombre: "Corte clásico",
      descripcion: "Corte de cabello tradicional",
      duracionMin: 30,
      precio: 5000,
    },
  });

  const corteBarba = await prisma.servicio.upsert({
    where: { id: "seed-servicio-corte-barba" },
    update: {},
    create: {
      id: "seed-servicio-corte-barba",
      negocioId: negocio.id,
      nombre: "Corte + Barba",
      descripcion: "Corte de cabello y arreglo de barba",
      duracionMin: 45,
      precio: 8000,
    },
  });

  // Lunes a viernes, 09:00 a 18:00
  for (const diaSemana of [1, 2, 3, 4, 5]) {
    await prisma.disponibilidad.upsert({
      where: { id: `seed-disponibilidad-${barbero.id}-${diaSemana}` },
      update: {},
      create: {
        id: `seed-disponibilidad-${barbero.id}-${diaSemana}`,
        barberoId: barbero.id,
        diaSemana,
        horaInicio: "09:00",
        horaFin: "18:00",
      },
    });
  }

  await prisma.comision.upsert({
    where: { id: "seed-comision-corte" },
    update: {},
    create: {
      id: "seed-comision-corte",
      barberoId: barbero.id,
      servicioId: corteClasico.id,
      porcentaje: 40,
    },
  });

  await prisma.comision.upsert({
    where: { id: "seed-comision-corte-barba" },
    update: {},
    create: {
      id: "seed-comision-corte-barba",
      barberoId: barbero.id,
      servicioId: corteBarba.id,
      porcentaje: 40,
    },
  });

  return {
    negocio: negocio.slug,
    barbero: barbero.nombre,
    servicios: [corteClasico.nombre, corteBarba.nombre],
    credencialesDemo: {
      negocio: { email: negocio.email, password: PASSWORD_DEMO },
      barbero: { email: barbero.email, password: PASSWORD_DEMO },
    },
  };
}
