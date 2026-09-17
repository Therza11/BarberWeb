import type { DefaultSession } from "next-auth";

type Rol = "NEGOCIO" | "BARBERO";

declare module "next-auth" {
  interface User {
    role: Rol;
    negocioId?: string;
    barberoId?: string;
  }

  interface Session {
    user: {
      role?: Rol;
      negocioId?: string;
      barberoId?: string;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/types" {
  interface User {
    role: Rol;
    negocioId?: string;
    barberoId?: string;
  }

  interface Session {
    user: {
      role?: Rol;
      negocioId?: string;
      barberoId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Rol;
    negocioId?: string;
    barberoId?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Rol;
    negocioId?: string;
    barberoId?: string;
  }
}
