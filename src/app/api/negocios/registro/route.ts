import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: NextRequest) {
  let body: {
    nombre?: string;
    email?: string;
    password?: string;
    telefono?: string;
    direccion?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { nombre, email, password, telefono, direccion } = body;

  if (!nombre || !email || !password) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: nombre, email, password" },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres" },
      { status: 400 },
    );
  }

  const slugBase = slugify(nombre);
  if (!slugBase) {
    return NextResponse.json({ error: "Nombre invalido" }, { status: 400 });
  }

  try {
    let slug = slugBase;
    let intento = 0;

    // Si el slug ya existe, le agrega un sufijo numerico hasta encontrar uno libre.
    while (await prisma.negocio.findUnique({ where: { slug }, select: { id: true } })) {
      intento++;
      slug = `${slugBase}-${intento}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const negocio = await prisma.negocio.create({
      data: {
        nombre,
        slug,
        email,
        passwordHash,
        telefono,
        direccion,
      },
    });

    return NextResponse.json(
      { id: negocio.id, slug: negocio.slug, email: negocio.email },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un negocio registrado con ese email" },
        { status: 409 },
      );
    }
    throw error;
  }
}
