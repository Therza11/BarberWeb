import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarNegocio } from "@/lib/permisos";
import { ComisionesPanel } from "./comisiones-panel";
import { EquipoPanel } from "./equipo-panel";
import { OnboardingChecklist } from "./onboarding-checklist";
import { PlanBanner } from "./plan-banner";
import { ReportesPanel } from "./reportes-panel";
import { ServiciosPanel } from "./servicios-panel";
import { ReporteComisiones } from "./reporte-comisiones";

export default async function PanelNegocioPage() {
  const session = await auth();
  if (!puedeGestionarNegocio(session) || !session?.user.negocioId) redirect("/login");

  const [negocio, cantidadBarberos, cantidadServicios, cantidadDisponibilidad] =
    await Promise.all([
      prisma.negocio.findUnique({
        where: { id: session.user.negocioId },
        select: { plan: true, slug: true },
      }),
      prisma.barbero.count({
        where: { negocioId: session.user.negocioId, activo: true },
      }),
      prisma.servicio.count({
        where: { negocioId: session.user.negocioId, activo: true },
      }),
      prisma.disponibilidad.count({
        where: {
          activo: true,
          barbero: { negocioId: session.user.negocioId, activo: true },
        },
      }),
    ]);

  return (
    <div>
      <PlanBanner plan={negocio?.plan ?? "GRATIS"} />

      {negocio?.slug && (
        <OnboardingChecklist
          tieneBarberos={cantidadBarberos > 0}
          tieneServicios={cantidadServicios > 0}
          tieneDisponibilidad={cantidadDisponibilidad > 0}
          esIndependiente={Boolean(session.user.esIndependiente)}
          slug={negocio.slug}
        />
      )}

      <h1 className="font-display text-2xl font-semibold">Reportes</h1>
      <ReportesPanel />

      <h2 className="mt-10 font-display text-xl font-semibold">
        Detalle de turnos completados
      </h2>
      <ReporteComisiones />

      <h1 id="equipo" className="mt-12 font-display text-2xl font-semibold">
        Mi equipo
      </h1>
      <EquipoPanel />

      <h2 id="servicios" className="mt-10 font-display text-xl font-semibold">
        Mis servicios
      </h2>
      <ServiciosPanel />

      <h2 className="mt-10 font-display text-xl font-semibold">
        Comisiones por barbero
      </h2>
      <ComisionesPanel />
    </div>
  );
}
