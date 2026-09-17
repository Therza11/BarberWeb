"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Label, Select } from "@/components/ui/field";

type Disponibilidad = {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
};

const DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
];

export function DisponibilidadPanel() {
  const [items, setItems] = useState<Disponibilidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [diaSemana, setDiaSemana] = useState(1);
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("18:00");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/panel/disponibilidad");
      const data = await res.json();
      if (res.ok) setItems(data);
    } finally {
      setCargando(false);
    }
  }

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/panel/disponibilidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diaSemana, horaInicio, horaFin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo agregar");
        return;
      }
      await cargar();
    } finally {
      setEnviando(false);
    }
  }

  async function toggleActivo(item: Disponibilidad) {
    await fetch(`/api/panel/disponibilidad/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !item.activo }),
    });
    await cargar();
  }

  async function eliminar(id: string) {
    await fetch(`/api/panel/disponibilidad/${id}`, { method: "DELETE" });
    await cargar();
  }

  return (
    <div>
      <Card>
        <form onSubmit={agregar} className="flex flex-wrap items-end gap-3">
          <Field>
            <Label>Día</Label>
            <Select
              value={diaSemana}
              onChange={(e) => setDiaSemana(Number(e.target.value))}
            >
              {DIAS.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>

          <Field>
            <Label>Desde</Label>
            <Input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
            />
          </Field>

          <Field>
            <Label>Hasta</Label>
            <Input
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
            />
          </Field>

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
          {items.length === 0 && (
            <p className="p-4 text-sm text-fg-muted">
              No hay horarios cargados todavía.
            </p>
          )}
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4">
              <span className={`text-sm ${item.activo ? "" : "text-fg-muted line-through"}`}>
                {DIAS[item.diaSemana]}: {item.horaInicio} - {item.horaFin}
              </span>
              <span className="flex gap-2">
                <button
                  onClick={() => toggleActivo(item)}
                  className="rounded-md border border-border px-2 py-1 text-xs text-fg-muted hover:text-fg"
                >
                  {item.activo ? "Desactivar" : "Activar"}
                </button>
                <button
                  onClick={() => eliminar(item.id)}
                  className="rounded-md border border-danger/40 px-2 py-1 text-xs text-danger hover:bg-danger/10"
                >
                  Eliminar
                </button>
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
