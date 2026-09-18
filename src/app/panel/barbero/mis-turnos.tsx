"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

type Turno = {
  id: string;
  clienteNombre: string;
  direccionCliente: string | null;
  fecha: string;
  hora: string;
  estado: string;
  servicio: { nombre: string; precio: string; aDomicilio: boolean };
};

export function MisTurnos() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/panel/reservas");
      const data = await res.json();
      if (res.ok) setTurnos(data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    cargar();
  }, []);

  async function marcar(id: string, accion: "completar" | "no-asistio") {
    await fetch(`/api/panel/reservas/${id}/${accion}`, { method: "POST" });
    await cargar();
  }

  if (cargando) return <p className="mt-4 text-sm text-fg-muted">Cargando...</p>;

  return (
    <Card className="mt-6 divide-y divide-border p-0">
      {turnos.length === 0 && (
        <p className="p-4 text-sm text-fg-muted">No hay turnos pendientes.</p>
      )}
      {turnos.map((t) => (
        <div key={t.id} className="flex items-center justify-between p-4">
          <span className="text-sm">
            {t.fecha} {t.hora} — {t.clienteNombre}{" "}
            <span className="text-fg-muted">({t.servicio.nombre})</span>
            {t.servicio.aDomicilio && t.direccionCliente && (
              <span className="mt-1 block text-xs text-accent">
                Domicilio: {t.direccionCliente}
              </span>
            )}
          </span>
          <span className="flex gap-2">
            <button
              onClick={() => marcar(t.id, "completar")}
              className="rounded-md border border-success/40 px-2 py-1 text-xs text-success hover:bg-success/10"
            >
              Completado
            </button>
            <button
              onClick={() => marcar(t.id, "no-asistio")}
              className="rounded-md border border-border px-2 py-1 text-xs text-fg-muted hover:text-fg"
            >
              No asistió
            </button>
          </span>
        </div>
      ))}
    </Card>
  );
}
