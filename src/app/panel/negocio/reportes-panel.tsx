"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Field, Input, Label } from "@/components/ui/field";

type Resumen = {
  desde: string;
  hasta: string;
  ingresosTotales: string;
  turnosCompletados: number;
  turnosNoAsistio: number;
  tasaAusencia: number;
  clientesNuevos: number;
  clientesRecurrentes: number;
  horasPico: { hora: string; cantidad: number }[];
  porBarbero: {
    barberoId: string;
    nombre: string;
    turnos: number;
    ingresos: string;
    comision: string;
  }[];
};

function haceDiasISO(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

export function ReportesPanel() {
  const [desde, setDesde] = useState(haceDiasISO(30));
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch(`/api/panel/reportes/resumen?desde=${desde}&hasta=${hasta}`);
      const data = await res.json();
      if (res.ok) setResumen(data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxPico = resumen ? Math.max(1, ...resumen.horasPico.map((h) => h.cantidad)) : 1;

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          cargar();
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <Field>
          <Label>Desde</Label>
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </Field>
        <Field>
          <Label>Hasta</Label>
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </Field>
        <button
          type="submit"
          className="rounded-md border border-border px-3 py-2 text-sm text-fg-muted hover:text-fg"
        >
          Actualizar
        </button>
      </form>

      {cargando || !resumen ? (
        <p className="mt-4 text-sm text-fg-muted">Cargando...</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi label="Ingresos" valor={`$${resumen.ingresosTotales}`} />
            <Kpi label="Turnos completados" valor={String(resumen.turnosCompletados)} />
            <Kpi
              label="Tasa de ausencias"
              valor={`${(resumen.tasaAusencia * 100).toFixed(0)}%`}
            />
            <Kpi
              label="Clientes nuevos / recurrentes"
              valor={`${resumen.clientesNuevos} / ${resumen.clientesRecurrentes}`}
            />
          </div>

          <Card className="mt-6">
            <h3 className="font-display text-sm font-semibold text-fg-muted">
              Horas pico
            </h3>
            {resumen.horasPico.length === 0 ? (
              <p className="mt-2 text-sm text-fg-muted">Sin turnos completados en el período.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-1.5">
                {resumen.horasPico.map((h) => (
                  <div key={h.hora} className="flex items-center gap-2 text-xs">
                    <span className="w-10 shrink-0 text-fg-muted">{h.hora}</span>
                    <div className="h-3 flex-1 rounded bg-bg-elevated">
                      <div
                        className="h-3 rounded bg-accent"
                        style={{ width: `${(h.cantidad / maxPico) * 100}%` }}
                        title={`${h.cantidad} turnos`}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-fg-muted">{h.cantidad}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="mt-6 divide-y divide-border p-0">
            <div className="flex items-center justify-between p-4 text-xs font-medium uppercase tracking-wide text-fg-muted">
              <span>Barbero</span>
              <span>Turnos / Ingresos / Comisión</span>
            </div>
            {resumen.porBarbero.length === 0 && (
              <p className="p-4 text-sm text-fg-muted">Sin datos en el período.</p>
            )}
            {resumen.porBarbero.map((b) => (
              <div key={b.barberoId} className="flex items-center justify-between p-4 text-sm">
                <span>{b.nombre}</span>
                <span className="text-fg-muted">
                  {b.turnos} · ${b.ingresos} · ${b.comision}
                </span>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ label, valor }: { label: string; valor: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{valor}</p>
    </Card>
  );
}
