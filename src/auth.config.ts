import type { NextAuthConfig } from "next-auth";

// Config compartida entre el middleware (Edge Runtime) y el auth.ts completo
// (Node runtime). No debe importar Prisma ni nada que dependa de modulos
// nativos de Node, porque el middleware corre en Edge.
export default {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.negocioId = user.negocioId;
        token.barberoId = user.barberoId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.role) session.user.role = token.role;
      session.user.negocioId = token.negocioId;
      session.user.barberoId = token.barberoId;
      return session;
    },
  },
} satisfies NextAuthConfig;
