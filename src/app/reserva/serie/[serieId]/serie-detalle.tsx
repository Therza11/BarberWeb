"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { EstadoBadge } from "@/components/ui/badge";

type Ocurrencia = {
  token: string;
  fecha: string;
  hora: string;
  estado: string;
  indice: number;
  total: number;
};

type Serie = {
  negocio: string;
  barbero: string;
  servicio: string;
  duracionMin: number;
  precio: string;
  ocurrencias: Ocurrencia[];
};

export function SerieDetalle({ serieId }: { serieId: string }) {
  const [serie, setSerie] = useState<Serie | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/reservas/serie/${serieId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "No se pudo cargar la serie de turnos");
          return;
        }
        setSerie(data);
      })
      .catch(() => setError("No se pudo cargar la serie de turnos"))
      .finally(() => setCargando(false));
  }, [serieId]);

  if (cargando) return <p className="text-fg-muted">Cargando...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!serie) return null;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">{serie.negocio}</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Turno recurrente con {serie.barbero} — {serie.servicio} ({serie.duracionMin} min) - $
        {serie.precio}
      </p>

      <Card className="mt-4 divide-y divide-border p-0">
        {serie.ocurrencias.map((o) => (
          <a
            key={o.token}
            href={`/reserva/${o.token}`}
            className="flex items-center justify-between p-4 transition-colors hover:bg-bg-elevated"
          >
            <span className="text-sm">
              <span className="text-fg-muted">
                {o.indice}/{o.total}
              </span>{" "}
              {o.fecha} a las {o.hora}
            </span>
            <EstadoBadge estado={o.estado} />
          </a>
        ))}
      </Card>

      <p className="mt-4 text-xs text-fg-muted">
        Tocá cualquier turno para cancelarlo o reprogramarlo individualmente — no
        afecta a los demás de la serie.
      </p>
    </div>
  );
}
