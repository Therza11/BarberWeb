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

// Con el driver adapter (@prisma/adapter-pg), P2002 no trae `meta.target`
// como en el motor clasico de Prisma - el nombre del constraint viene en el
// mensaje de error (ej. "constraint: `negocios_slug_key`"), asi que
// matcheamos contra eso en vez de confiar en `meta.target`.
function esConflictoDe(error: unknown, constraintSuffix: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    (Array.isArray(error.meta?.target)
      ? (error.meta.target as string[]).includes(constraintSuffix)
      : error.message.includes(constraintSuffix))
  );
}

export async function POST(request: NextRequest) {
  let body: {
    nombre?: string;
    email?: string;
    password?: string;
    telefono?: string;
    direccion?: string;
    ciudad?: string;
    independiente?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { nombre, email, password, telefono, direccion, ciudad, independiente } = body;

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

  const passwordHash = await bcrypt.hash(password, 10);

  // Reintenta con un sufijo numerico incremental si otro registro se cuela
  // con el mismo slug entre que lo elegimos y lo insertamos (el check previo
  // con findUnique no es atomico, esto cierra esa carrera).
  const INTENTOS_MAX = 5;
  for (let intento = 0; intento <= INTENTOS_MAX; intento++) {
    const slug = intento === 0 ? slugBase : `${slugBase}-${intento}`;

    try {
      const negocio = await prisma.$transaction(async (tx) => {
        const nuevoNegocio = await tx.negocio.create({
          data: { nombre, slug, email, passwordHash, telefono, direccion, ciudad },
        });

        if (independiente) {
          // Barbero independiente: crea tambien su propio registro de
          // Barbero, con el mismo email/contraseña, para que un solo login
          // le de acceso tanto al panel de negocio como al de turnos (ver
          // src/auth.ts). Va en la misma transaccion que el Negocio: si el
          // email ya esta usado por otro Barbero, no queremos un Negocio
          // huerfano creado a medias.
          await tx.barbero.create({
            data: { negocioId: nuevoNegocio.id, nombre, email, passwordHash, telefono },
          });
        }

        return nuevoNegocio;
      });

      return NextResponse.json(
        { id: negocio.id, slug: negocio.slug, email: negocio.email },
        { status: 201 },
      );
    } catch (error) {
      if (esConflictoDe(error, "slug") && intento < INTENTOS_MAX) {
        continue;
      }
      if (esConflictoDe(error, "email")) {
        return NextResponse.json(
          { error: "Ya existe una cuenta registrada con ese email" },
          { status: 409 },
        );
      }
      if (esConflictoDe(error, "slug")) {
        return NextResponse.json(
          { error: "Ya existe un negocio con un nombre muy similar, proba con otro" },
          { status: 409 },
        );
      }
      throw error;
    }
  }

  // Inalcanzable: el loop siempre retorna o lanza.
  return NextResponse.json({ error: "No se pudo completar el registro" }, { status: 500 });
}
