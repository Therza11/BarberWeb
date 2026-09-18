"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Label } from "@/components/ui/field";

type Servicio = {
  id: string;
  nombre: string;
  duracionMin: number;
  precio: string;
  aDomicilio: boolean;
  tiempoTrasladoMin: number | null;
  activo: boolean;
};

export function ServiciosPanel() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [duracionMin, setDuracionMin] = useState("30");
  const [precio, setPrecio] = useState("");
  const [aDomicilio, setADomicilio] = useState(false);
  const [tiempoTrasladoMin, setTiempoTrasladoMin] = useState("15");
  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/panel/servicios");
      const data = await res.json();
      if (res.ok) setServicios(data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    cargar();
  }, []);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/panel/servicios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          duracionMin: Number(duracionMin),
          precio: Number(precio),
          aDomicilio,
          tiempoTrasladoMin: aDomicilio ? Number(tiempoTrasladoMin) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo agregar el servicio");
        return;
      }
      setNombre("");
      setPrecio("");
      setADomicilio(false);
      await cargar();
    } finally {
      setEnviando(false);
    }
  }

  async function toggleActivo(servicio: Servicio) {
    await fetch(`/api/panel/servicios/${servicio.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !servicio.activo }),
    });
    await cargar();
  }

  return (
    <div>
      <Card>
        <form onSubmit={agregar} className="flex flex-wrap items-end gap-3">
          <Field>
            <Label>Nombre</Label>
            <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Field>

          <Field>
            <Label>Duración (min)</Label>
            <Input
              type="number"
              min="1"
              required
              className="w-24"
              value={duracionMin}
              onChange={(e) => setDuracionMin(e.target.value)}
            />
          </Field>

          <Field>
            <Label>Precio</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              required
              className="w-28"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </Field>

          <label className="flex items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={aDomicilio}
              onChange={(e) => setADomicilio(e.target.checked)}
            />
            A domicilio
          </label>

          {aDomicilio && (
            <Field>
              <Label>Traslado (min)</Label>
              <Input
                type="number"
                min="1"
                required
                className="w-24"
                value={tiempoTrasladoMin}
                onChange={(e) => setTiempoTrasladoMin(e.target.value)}
              />
            </Field>
          )}

          <Button type="submit" disabled={enviando}>
            Agregar
          </Button>
        </form>

        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </Card>

      {cargando ? (
        <p className="mt-4 text-sm text-fg-muted">Cargando...</p>
      ) : (
        <Card className="mt-6 divide-y divide-border p-0">
          {servicios.length === 0 && (
            <p className="p-4 text-sm text-fg-muted">Todavía no cargaste servicios.</p>
          )}
          {servicios.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4">
              <span className={`text-sm ${s.activo ? "" : "text-fg-muted line-through"}`}>
                {s.nombre} ({s.duracionMin} min) - ${s.precio}
                {s.aDomicilio && (
                  <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                    a domicilio (+{s.tiempoTrasladoMin} min)
                  </span>
                )}
              </span>
              <button
                onClick={() => toggleActivo(s)}
                className="rounded-md border border-border px-2 py-1 text-xs text-fg-muted hover:text-fg"
              >
                {s.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
