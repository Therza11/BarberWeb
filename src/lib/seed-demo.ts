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

  // Servicios base
  const corte = await prisma.servicio.upsert({
    where: { id: "seed-servicio-corte" },
    update: { nombre: "Corte de pelo", duracionMin: 30, precio: 5000 },
    create: {
      id: "seed-servicio-corte",
      negocioId: negocio.id,
      nombre: "Corte de pelo",
      descripcion: "Corte de cabello",
      duracionMin: 30,
      precio: 5000,
    },
  });

  const barba = await prisma.servicio.upsert({
    where: { id: "seed-servicio-barba" },
    update: {},
    create: {
      id: "seed-servicio-barba",
      negocioId: negocio.id,
      nombre: "Barba",
      descripcion: "Arreglo y perfilado de barba",
      duracionMin: 20,
      precio: 3000,
    },
  });

  const cejas = await prisma.servicio.upsert({
    where: { id: "seed-servicio-cejas" },
    update: {},
    create: {
      id: "seed-servicio-cejas",
      negocioId: negocio.id,
      nombre: "Cejas",
      descripcion: "Perfilado de cejas",
      duracionMin: 10,
      precio: 1500,
    },
  });

  // Combinaciones
  const corteBarba = await prisma.servicio.upsert({
    where: { id: "seed-servicio-corte-barba" },
    update: { nombre: "Corte + Barba", duracionMin: 45, precio: 7500 },
    create: {
      id: "seed-servicio-corte-barba",
      negocioId: negocio.id,
      nombre: "Corte + Barba",
      descripcion: "Corte de cabello y arreglo de barba",
      duracionMin: 45,
      precio: 7500,
    },
  });

  const corteCejas = await prisma.servicio.upsert({
    where: { id: "seed-servicio-corte-cejas" },
    update: {},
    create: {
      id: "seed-servicio-corte-cejas",
      negocioId: negocio.id,
      nombre: "Corte + Cejas",
      descripcion: "Corte de cabello y perfilado de cejas",
      duracionMin: 35,
      precio: 6000,
    },
  });

  const barbaCejas = await prisma.servicio.upsert({
    where: { id: "seed-servicio-barba-cejas" },
    update: {},
    create: {
      id: "seed-servicio-barba-cejas",
      negocioId: negocio.id,
      nombre: "Barba + Cejas",
      descripcion: "Arreglo de barba y perfilado de cejas",
      duracionMin: 25,
      precio: 4000,
    },
  });

  const combo = await prisma.servicio.upsert({
    where: { id: "seed-servicio-combo" },
    update: {},
    create: {
      id: "seed-servicio-combo",
      negocioId: negocio.id,
      nombre: "Corte + Barba + Cejas",
      descripcion: "El combo completo",
      duracionMin: 55,
      precio: 9000,
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
      servicioId: corte.id,
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
    servicios: [
      corte.nombre,
      barba.nombre,
      cejas.nombre,
      corteBarba.nombre,
      corteCejas.nombre,
      barbaCejas.nombre,
      combo.nombre,
    ],
    credencialesDemo: {
      negocio: { email: negocio.email, password: PASSWORD_DEMO },
      barbero: { email: barbero.email, password: PASSWORD_DEMO },
    },
  };
}
