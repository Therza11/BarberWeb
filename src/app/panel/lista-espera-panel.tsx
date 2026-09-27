"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { EstadoBadge } from "@/components/ui/badge";

type Entrada = {
  id: string;
  fecha: string;
  estado: string;
  clienteNombre: string;
  clienteTelefono: string;
  barbero: string;
  servicio: string;
};

export function ListaEsperaPanel() {
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/panel/lista-espera")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEntradas(data);
      })
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p className="mt-4 text-sm text-fg-muted">Cargando...</p>;

  if (entradas.length === 0) {
    return (
      <Card className="mt-4">
        <p className="text-sm text-fg-muted">Nadie está esperando un turno por ahora.</p>
      </Card>
    );
  }

  return (
    <Card className="mt-4 divide-y divide-border p-0">
      {entradas.map((e) => (
        <div key={e.id} className="flex items-center justify-between p-4">
          <span className="text-sm">
            {e.fecha} — {e.clienteNombre} ({e.clienteTelefono})
            <span className="text-fg-muted"> · {e.barbero} · {e.servicio}</span>
          </span>
          <EstadoBadge estado={e.estado} />
        </div>
      ))}
    </Card>
  );
}
