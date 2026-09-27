import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";

// Instancia liviana, sin el Credentials provider (que depende de Prisma),
// para mantener el proxy simple. Next.js 16 corre `proxy.ts` en Node.js
// runtime por defecto (a diferencia del viejo `middleware.ts`, que
// defaulteaba a Edge Runtime y no soportaba los modulos nativos que usa el
// cliente de Prisma).
const { auth } = NextAuth(authConfig);

// Host de la app "propia" (Vercel u origen configurado). Cualquier otro Host
// que llegue se busca contra Negocio.dominioPersonalizado (dominio propio,
// plan Pro): si matchea, la request se reescribe a /reservar/[slug] sin
// cambiar la URL visible. Vercel debe tener el dominio agregado al proyecto
// (Settings -> Domains) y el negocio con el CNAME apuntando a Vercel: eso
// sigue siendo un paso manual del operador, esto solo resuelve el ruteo.
const HOST_PROPIO = (() => {
  try {
    return process.env.APP_URL ? new URL(process.env.APP_URL).host : undefined;
  } catch {
    return undefined;
  }
})();

// Cache en memoria del proceso (por instancia serverless "tibia"): evita una
// consulta a la base por cada request al mismo dominio propio. TTL corto
// porque un negocio puede desactivarse o cambiar de dominio.
const CACHE_TTL_MS = 60_000;
const cacheDominios = new Map<string, { slug: string | null; expira: number }>();

async function resolverSlugPorDominio(host: string): Promise<string | null> {
  const cacheado = cacheDominios.get(host);
  if (cacheado && cacheado.expira > Date.now()) return cacheado.slug;

  const negocio = await prisma.negocio.findFirst({
    where: { dominioPersonalizado: host, activo: true },
    select: { slug: true },
  });

  const slug = negocio?.slug ?? null;
  cacheDominios.set(host, { slug, expira: Date.now() + CACHE_TTL_MS });
  return slug;
}

async function manejarDominioPropio(req: NextRequest): Promise<NextResponse | null> {
  const host = req.headers.get("host");
  if (!host || host === HOST_PROPIO || host.includes("localhost")) return null;

  const slug = await resolverSlugPorDominio(host);
  if (!slug) return null;

  const url = req.nextUrl.clone();
  url.pathname = `/reservar/${slug}`;
  return NextResponse.rewrite(url);
}

export default auth(async (req) => {
  const reescritura = await manejarDominioPropio(req);
  if (reescritura) return reescritura;

  if (req.nextUrl.pathname.startsWith("/panel") && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
