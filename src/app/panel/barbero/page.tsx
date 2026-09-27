import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { puedeGestionarTurnos } from "@/lib/permisos";
import { ResenasPanel } from "../resenas-panel";
import { ListaEsperaPanel } from "../lista-espera-panel";
import { DisponibilidadPanel } from "./disponibilidad-panel";
import { MisTurnos } from "./mis-turnos";

export default async function PanelBarberoPage() {
  const session = await auth();
  if (!puedeGestionarTurnos(session)) redirect("/login");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Mis turnos</h1>
      <MisTurnos />

      <h2 className="mt-10 font-display text-xl font-semibold">Mi disponibilidad</h2>
      <DisponibilidadPanel />

      <h2 className="mt-10 font-display text-xl font-semibold">Mis reseñas</h2>
      <ResenasPanel />

      <h2 className="mt-10 font-display text-xl font-semibold">Lista de espera</h2>
      <ListaEsperaPanel />
    </div>
  );
}
