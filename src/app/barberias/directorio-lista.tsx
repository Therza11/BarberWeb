"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Field, Label, Select } from "@/components/ui/field";

type Negocio = {
  nombre: string;
  slug: string;
  ciudad: string | null;
  direccion: string | null;
  cantidadBarberos: number;
};

export function DirectorioLista() {
  const [ciudades, setCiudades] = useState<string[]>([]);
  const [ciudad, setCiudad] = useState("");
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [cargando, setCargando] = useState(true);

  async function cargarCiudades() {
    const res = await fetch("/api/negocios/ciudades");
    const data = await res.json();
    if (res.ok) setCiudades(data);
  }

  async function cargarNegocios(filtroCiudad: string) {
    setCargando(true);
    try {
      const url = filtroCiudad
        ? `/api/negocios?ciudad=${encodeURIComponent(filtroCiudad)}`
        : "/api/negocios";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setNegocios(data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    cargarCiudades();
    cargarNegocios("");
  }, []);

  return (
    <div>
      <div className="mt-6 max-w-xs">
        <Field>
          <Label>Ciudad</Label>
          <Select
            value={ciudad}
            onChange={(e) => {
              setCiudad(e.target.value);
              cargarNegocios(e.target.value);
            }}
          >
            <option value="">Todas las ciudades</option>
            {ciudades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {cargando ? (
        <p className="mt-6 text-sm text-fg-muted">Cargando...</p>
      ) : negocios.length === 0 ? (
        <p className="mt-6 text-sm text-fg-muted">
          No hay barberías cargadas todavía para ese filtro.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {negocios.map((n) => (
            <a key={n.slug} href={`/reservar/${n.slug}`}>
              <Card className="h-full transition-colors hover:border-accent">
                <h2 className="font-display text-lg font-semibold">{n.nombre}</h2>
                {n.ciudad && <p className="text-sm text-accent">{n.ciudad}</p>}
                {n.direccion && (
                  <p className="mt-1 text-sm text-fg-muted">{n.direccion}</p>
                )}
                <p className="mt-2 text-xs text-fg-muted">
                  {n.cantidadBarberos}{" "}
                  {n.cantidadBarberos === 1 ? "barbero" : "barberos"}
                </p>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
