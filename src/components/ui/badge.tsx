const ESTILOS: Record<string, string> = {
  PENDIENTE: "bg-accent/15 text-accent",
  CONFIRMADA: "bg-success/15 text-success",
  CANCELADA: "bg-danger/15 text-danger",
  COMPLETADA: "bg-fg/10 text-fg-muted",
  NO_ASISTIO: "bg-danger/10 text-danger",
};

export function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${ESTILOS[estado] ?? "bg-fg/10 text-fg-muted"}`}
    >
      {estado.replace("_", " ").toLowerCase()}
    </span>
  );
}
