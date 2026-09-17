import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        tipo: {},
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        const tipo = credentials?.tipo;

        if (
          typeof email !== "string" ||
          typeof password !== "string" ||
          (tipo !== "negocio" && tipo !== "barbero")
        ) {
          return null;
        }

        if (tipo === "negocio") {
          const negocio = await prisma.negocio.findUnique({ where: { email } });
          if (!negocio || !negocio.activo) return null;
          const ok = await bcrypt.compare(password, negocio.passwordHash);
          if (!ok) return null;

          return {
            id: negocio.id,
            email: negocio.email,
            name: negocio.nombre,
            role: "NEGOCIO" as const,
            negocioId: negocio.id,
          };
        }

        const barbero = await prisma.barbero.findUnique({ where: { email } });
        if (!barbero || !barbero.activo) return null;
        const ok = await bcrypt.compare(password, barbero.passwordHash);
        if (!ok) return null;

        return {
          id: barbero.id,
          email: barbero.email,
          name: barbero.nombre,
          role: "BARBERO" as const,
          barberoId: barbero.id,
          negocioId: barbero.negocioId,
        };
      },
    }),
  ],
});
