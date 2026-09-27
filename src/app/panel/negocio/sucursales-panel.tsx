"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Label } from "@/components/ui/field";

type Sucursal = {
  id: string;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  activo: boolean;
};

export function SucursalesPanel({ plan }: { plan: string }) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [enviando, setEnviando] = useState(false);

  const esPro = plan === "PRO";

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/panel/sucursales");
      const data = await res.json();
      if (res.ok) setSucursales(data);
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
      const res = await fetch("/api/panel/sucursales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          direccion: direccion || undefined,
          ciudad: ciudad || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo agregar la sucursal");
        return;
      }
      setNombre("");
      setDireccion("");
      setCiudad("");
      await cargar();
    } finally {
      setEnviando(false);
    }
  }

  async function toggleActivo(sucursal: Sucursal) {
    await fetch(`/api/panel/sucursales/${sucursal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !sucursal.activo }),
    });
    await cargar();
  }

  return (
    <div>
      {!esPro && (
        <p className="mb-3 text-xs text-fg-muted">
          Multi-sucursal es una función del plan Pro. Con el plan Gratis tu negocio
          funciona como una sola sede (tu dirección de contacto).
        </p>
      )}

      {esPro && (
        <Card>
          <form onSubmit={agregar} className="flex flex-wrap items-end gap-3">
            <Field>
              <Label>Nombre de la sede</Label>
              <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </Field>

            <Field>
              <Label>Dirección (opcional)</Label>
              <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            </Field>

            <Field>
              <Label>Ciudad (opcional)</Label>
              <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
            </Field>

            <Button type="submit" disabled={enviando}>
              Agregar sede
            </Button>
          </form>

          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </Card>
      )}

      {cargando ? (
        <p className="mt-4 text-sm text-fg-muted">Cargando...</p>
      ) : (
        sucursales.length > 0 && (
          <Card className="mt-6 divide-y divide-border p-0">
            {sucursales.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4">
                <span className={`text-sm ${s.activo ? "" : "text-fg-muted line-through"}`}>
                  {s.nombre}
                  {s.direccion ? ` — ${s.direccion}` : ""}
                  {s.ciudad ? ` (${s.ciudad})` : ""}
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
        )
      )}
    </div>
  );
}
