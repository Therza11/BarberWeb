import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

// Instancia liviana, sin el Credentials provider (que depende de Prisma),
// para mantener el proxy simple. Next.js 16 corre `proxy.ts` en Node.js
// runtime por defecto (a diferencia del viejo `middleware.ts`, que
// defaulteaba a Edge Runtime y no soportaba los modulos nativos que usa el
// cliente de Prisma).
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/panel/:path*"],
};
