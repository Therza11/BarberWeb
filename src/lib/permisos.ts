import type { Session } from "next-auth";

/**
 * Un barbero independiente registra un Negocio y un Barbero con el mismo
 * email (ver /api/negocios/registro), y su login (con cualquiera de los
 * dos "tipo") queda marcado `esIndependiente`. Estas funciones deciden si
 * la sesion actual puede operar cada panel/API, sin importar con que tipo
 * inicio sesion.
 */

export function puedeGestionarNegocio(session: Session | null): boolean {
  if (!session?.user) return false;
  return (
    session.user.role === "NEGOCIO" ||
    (session.user.role === "BARBERO" && Boolean(session.user.esIndependiente))
  );
}

export function puedeGestionarTurnos(session: Session | null): boolean {
  if (!session?.user) return false;
  return (
    session.user.role === "BARBERO" ||
    (session.user.role === "NEGOCIO" && Boolean(session.user.esIndependiente))
  );
}
