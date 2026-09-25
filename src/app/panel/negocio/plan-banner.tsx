const TEXTOS: Record<string, { titulo: string; detalle: string }> = {
  GRATIS: {
    titulo: "Plan Gratis",
    detalle: "Hasta 1 barbero activo, sin servicios a domicilio.",
  },
  PRO: {
    titulo: "Plan Pro",
    detalle: "Barberos ilimitados y servicios a domicilio habilitados.",
  },
};

export function PlanBanner({ plan }: { plan: string }) {
  const texto = TEXTOS[plan] ?? TEXTOS.GRATIS;

  return (
    <div className="mb-6 flex items-center justify-between rounded-lg border border-border bg-bg-card px-4 py-3">
      <div>
        <span className="font-display text-sm font-semibold text-accent">
          {texto.titulo}
        </span>
        <p className="text-xs text-fg-muted">{texto.detalle}</p>
      </div>
      {plan === "GRATIS" && (
        <a
          href={`mailto:${process.env.CONTACTO_UPGRADE_EMAIL ?? "contacto@barberweb.app"}?subject=Quiero%20actualizar%20a%20Pro`}
          className="rounded-md border border-accent px-3 py-1.5 text-xs text-accent hover:bg-accent/10"
        >
          Actualizar a Pro
        </a>
      )}
    </div>
  );
}
