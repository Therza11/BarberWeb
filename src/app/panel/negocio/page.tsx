import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ComisionesPanel } from "./comisiones-panel";
import { EquipoPanel } from "./equipo-panel";
import { ServiciosPanel } from "./servicios-panel";
import { ReporteComisiones } from "./reporte-comisiones";

export default async function PanelNegocioPage() {
  const session = await auth();
  if (!session || session.user.role !== "NEGOCIO") redirect("/login");

  return (
    <div>
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
