"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Label, Select } from "@/components/ui/field";

type Opcion = { id: string; nombre: string };
type Comision = {
  id: string;
  barberoId: string;
  barbero: string;
  servicioId: string;
  servicio: string;
  porcentaje: string | null;
  montoFijo: string | null;
};

export function ComisionesPanel() {
  const [barberos, setBarberos] = useState<Opcion[]>([]);
  const [servicios, setServicios] = useState<Opcion[]>([]);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [barberoId, setBarberoId] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [tipo, setTipo] = useState<"porcentaje" | "montoFijo">("porcentaje");
  const [valor, setValor] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    try {
      const [negocioRes, comisionesRes] = await Promise.all([
        fetch("/api/panel/negocio"),
        fetch("/api/panel/comisiones"),
      ]);
      const negocio = await negocioRes.json();
      const listaComisiones = await comisionesRes.json();

      if (negocioRes.ok) {
        setBarberos(negocio.barberos);
        setServicios(negocio.servicios);
        setBarberoId((prev) => prev || negocio.barberos[0]?.id || "");
        setServicioId((prev) => prev || negocio.servicios[0]?.id || "");
      }
      if (comisionesRes.ok) setComisiones(listaComisiones);
    } finally {
      setCargando(false);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/panel/comisiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberoId,
          servicioId,
          porcentaje: tipo === "porcentaje" ? Number(valor) : undefined,
          montoFijo: tipo === "montoFijo" ? Number(valor) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar");
        return;
      }
      setValor("");
      await cargar();
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar(id: string) {
    await fetch(`/api/panel/comisiones/${id}`, { method: "DELETE" });
    await cargar();
  }

  if (cargando) return <p className="mt-4 text-sm text-fg-muted">Cargando...</p>;

  return (
    <div>
      <Card>
        <form onSubmit={guardar} className="flex flex-wrap items-end gap-3">
          <Field>
            <Label>Barbero</Label>
            <Select value={barberoId} onChange={(e) => setBarberoId(e.target.value)}>
              {barberos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field>
            <Label>Servicio</Label>
            <Select value={servicioId} onChange={(e) => setServicioId(e.target.value)}>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field>
            <Label>Tipo</Label>
            <Select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "porcentaje" | "montoFijo")}
            >
              <option value="porcentaje">% del servicio</option>
              <option value="montoFijo">Monto fijo</option>
            </Select>
          </Field>

          <Field>
            <Label>{tipo === "porcentaje" ? "Porcentaje" : "Monto"}</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              required
              className="w-28"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </Field>

          <Button type="submit" disabled={enviando}>
            Guardar
          </Button>
        </form>

        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </Card>

      <Card className="mt-6 divide-y divide-border p-0">
        {comisiones.length === 0 && (
          <p className="p-4 text-sm text-fg-muted">
            No hay reglas de comisión cargadas todavía.
          </p>
        )}
        {comisiones.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4">
            <span className="text-sm">
              {c.barbero} - {c.servicio}:{" "}
              <span className="text-accent">
                {c.porcentaje ? `${c.porcentaje}%` : `$${c.montoFijo}`}
              </span>
            </span>
            <button
              onClick={() => eliminar(c.id)}
              className="rounded-md border border-danger/40 px-2 py-1 text-xs text-danger hover:bg-danger/10"
            >
              Eliminar
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}
