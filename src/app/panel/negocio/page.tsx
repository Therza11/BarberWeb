import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGestionarNegocio } from "@/lib/permisos";
import { ComisionesPanel } from "./comisiones-panel";
import { EquipoPanel } from "./equipo-panel";
import { PlanBanner } from "./plan-banner";
import { ServiciosPanel } from "./servicios-panel";
import { ReporteComisiones } from "./reporte-comisiones";

export default async function PanelNegocioPage() {
  const session = await auth();
  if (!puedeGestionarNegocio(session) || !session?.user.negocioId) redirect("/login");

  const negocio = await prisma.negocio.findUnique({
    where: { id: session.user.negocioId },
    select: { plan: true },
  });

  return (
    <div>
      <PlanBanner plan={negocio?.plan ?? "GRATIS"} />

      <h1 className="font-display text-2xl font-semibold">Mi equipo</h1>
      <EquipoPanel />

      <h2 className="mt-10 font-display text-xl font-semibold">Mis servicios</h2>
      <ServiciosPanel />

      <h2 className="mt-10 font-display text-xl font-semibold">
        Comisiones por barbero
      </h2>
      <ComisionesPanel />

      <h2 className="mt-10 font-display text-xl font-semibold">
        Reporte de turnos completados
      </h2>
      <ReporteComisiones />
    </div>
  );
}
