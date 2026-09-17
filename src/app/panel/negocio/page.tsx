import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ComisionesPanel } from "./comisiones-panel";
import { ReporteComisiones } from "./reporte-comisiones";

export default async function PanelNegocioPage() {
  const session = await auth();
  if (!session || session.user.role !== "NEGOCIO") redirect("/login");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Comisiones por barbero</h1>
      <ComisionesPanel />

      <h2 className="mt-10 font-display text-xl font-semibold">
        Reporte de turnos completados
      </h2>
      <ReporteComisiones />
    </div>
  );
}
