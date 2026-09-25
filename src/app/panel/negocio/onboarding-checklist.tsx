import { CopyLinkLine } from "./copy-link-line";

type Props = {
  tieneBarberos: boolean;
  tieneServicios: boolean;
  tieneDisponibilidad: boolean;
  esIndependiente: boolean;
  slug: string;
};

function Paso({
  hecho,
  children,
}: {
  hecho: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
          hecho
            ? "border-success bg-success/15 text-success"
            : "border-border text-fg-muted"
        }`}
      >
        {hecho ? "✓" : ""}
      </span>
      <div className={`text-sm ${hecho ? "text-fg-muted line-through" : "text-fg"}`}>
        {children}
      </div>
    </li>
  );
}

export function OnboardingChecklist({
  tieneBarberos,
  tieneServicios,
  tieneDisponibilidad,
  esIndependiente,
  slug,
}: Props) {
  const todoListo = tieneBarberos && tieneServicios && tieneDisponibilidad;
  if (todoListo) return null;

  return (
    <div className="mb-8 rounded-lg border border-accent/40 bg-bg-card p-5">
      <h2 className="font-display text-lg font-semibold text-accent">
        Primeros pasos para empezar a recibir turnos
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        <Paso hecho={tieneBarberos}>
          {esIndependiente ? (
            "Tu perfil de barbero ya está listo."
          ) : (
            <>
              Agregá al menos un barbero en{" "}
              <a href="#equipo" className="text-accent underline">
                Mi equipo
              </a>
              .
            </>
          )}
        </Paso>
        <Paso hecho={tieneServicios}>
          Cargá al menos un servicio en{" "}
          <a href="#servicios" className="text-accent underline">
            Mis servicios
          </a>
          .
        </Paso>
        <Paso hecho={tieneDisponibilidad}>
          {esIndependiente ? (
            <>
              Cargá tu disponibilidad en{" "}
              <a href="/panel/barbero" className="text-accent underline">
                Mis turnos
              </a>
              .
            </>
          ) : (
            "Pedile a tus barberos que carguen su disponibilidad iniciando sesión con su propio usuario."
          )}
        </Paso>
      </ul>

      {tieneBarberos && tieneServicios && !tieneDisponibilidad && (
        <p className="mt-4 text-xs text-fg-muted">
          Sin disponibilidad cargada, nadie va a poder reservar todavía.
        </p>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs uppercase tracking-wide text-fg-muted">
          Cuando termines, compartí tu link de reserva
        </p>
        <CopyLinkLine slug={slug} />
      </div>
    </div>
  );
}
