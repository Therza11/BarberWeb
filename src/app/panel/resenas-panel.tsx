"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { StarsDisplay } from "@/components/ui/stars";

type Resena = {
  id: string;
  calificacion: number;
  comentario: string | null;
  fecha: string;
  barbero: string;
  cliente: string;
  servicio: string;
};

export function ResenasPanel() {
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/panel/resenas")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setResenas(data);
      })
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p className="mt-4 text-sm text-fg-muted">Cargando...</p>;

  if (resenas.length === 0) {
    return (
      <Card className="mt-4">
        <p className="text-sm text-fg-muted">Todavía no recibiste reseñas.</p>
      </Card>
    );
  }

  const promedio = resenas.reduce((acc, r) => acc + r.calificacion, 0) / resenas.length;

  return (
    <div className="mt-4">
      <StarsDisplay promedio={promedio} cantidad={resenas.length} />
      <Card className="mt-3 divide-y divide-border p-0">
        {resenas.map((r) => (
          <div key={r.id} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-accent">
                {"★".repeat(r.calificacion)}
                {"☆".repeat(5 - r.calificacion)}
              </span>
              <span className="text-xs text-fg-muted">{r.fecha}</span>
            </div>
            <p className="mt-1 text-sm text-fg-muted">
              {r.barbero} — {r.servicio} ({r.cliente})
            </p>
            {r.comentario && <p className="mt-2 text-sm">{r.comentario}</p>}
          </div>
        ))}
      </Card>
    </div>
  );
}
