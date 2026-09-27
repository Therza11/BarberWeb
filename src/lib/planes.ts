// Limites del plan Gratis (freemium). El plan Pro no tiene ninguno de estos
// limites. El cambio de plan es manual via /api/admin/negocios/[slug]/plan
// mientras no haya una pasarela de pago integrada.
export const LIMITE_BARBEROS_GRATIS = 1;

// Multi-sucursal, dominio propio y sena via Wompi son features exclusivas
// del plan Pro: un negocio Gratis sigue funcionando como sede unica.
export function puedeUsarSucursales(plan: string): boolean {
  return plan === "PRO";
}

export function puedeUsarDominioPropio(plan: string): boolean {
  return plan === "PRO";
}

export function puedeUsarSena(plan: string): boolean {
  return plan === "PRO";
}
