"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Label } from "@/components/ui/field";

type Barbero = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  activo: boolean;
};

export function EquipoPanel() {
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/panel/barberos");
      const data = await res.json();
      if (res.ok) setBarberos(data);
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
      const res = await fetch("/api/panel/barberos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password, telefono: telefono || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo agregar el barbero");
        return;
      }
      setNombre("");
      setEmail("");
      setPassword("");
      setTelefono("");
      await cargar();
    } finally {
      setEnviando(false);
    }
  }

  async function toggleActivo(barbero: Barbero) {
    await fetch(`/api/panel/barberos/${barbero.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !barbero.activo }),
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
            <Label>Email</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field>
            <Label>Contraseña</Label>
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <Field>
            <Label>Teléfono (opcional)</Label>
            <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
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
          {barberos.length === 0 && (
            <p className="p-4 text-sm text-fg-muted">Todavía no agregaste barberos.</p>
          )}
          {barberos.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4">
              <span className={`text-sm ${b.activo ? "" : "text-fg-muted line-through"}`}>
                {b.nombre} — {b.email}
              </span>
              <button
                onClick={() => toggleActivo(b)}
                className="rounded-md border border-border px-2 py-1 text-xs text-fg-muted hover:text-fg"
              >
                {b.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
