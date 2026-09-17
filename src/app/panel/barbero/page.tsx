import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DisponibilidadPanel } from "./disponibilidad-panel";
import { MisTurnos } from "./mis-turnos";

export default async function PanelBarberoPage() {
  const session = await auth();
  if (!session || session.user.role !== "BARBERO") redirect("/login");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Mis turnos</h1>
      <MisTurnos />

      <h2 className="mt-10 font-display text-xl font-semibold">Mi disponibilidad</h2>
      <DisponibilidadPanel />
    </div>
  );
}
