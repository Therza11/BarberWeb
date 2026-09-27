"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Label } from "@/components/ui/field";

type Props = {
  barberoId: string;
  servicioId: string;
  fecha: string;
};

// Se muestra cuando un dia no tiene horarios libres. No reserva nada: solo
// avisa por email si se libera un turno ese dia (ver notificarListaEspera en
// src/lib/lista-espera.ts, disparado al cancelar/reprogramar una reserva).
export function ListaEsperaForm({ barberoId, servicioId, fecha }: Props) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  async function anotarse() {
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/lista-espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberoId,
          servicioId,
          fecha,
          clienteNombre: nombre,
          clienteTelefono: telefono,
          clienteEmail: email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo anotar en la lista de espera");
        return;
      }
      setToken(data.token);
    } finally {
      setEnviando(false);
    }
  }

  if (token) {
    return (
      <div className="rounded-md border border-success/30 bg-success/5 p-3 text-sm">
        <p>Te anotamos en la lista de espera. Te avisamos por email si se libera un turno.</p>
        <a
          href={`/lista-espera/${token}`}
          className="mt-1 block break-all font-mono text-xs text-accent underline"
        >
          /lista-espera/{token}
        </a>
      </div>
    );
  }

  if (!mostrarForm) {
    return (
      <button
        type="button"
        onClick={() => setMostrarForm(true)}
        className="text-sm text-accent underline"
      >
        Anotarme en lista de espera para este día
      </button>
    );
  }

  const listo = nombre.trim() && telefono.trim() && /\S+@\S+\.\S+/.test(email);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <Field>
        <Label>Nombre</Label>
        <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Field>
      <Field>
        <Label>Teléfono</Label>
        <Input required value={telefono} onChange={(e) => setTelefono(e.target.value)} />
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
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="button" disabled={!listo || enviando} onClick={anotarse}>
        {enviando ? "Anotando..." : "Anotarme"}
      </Button>
    </div>
  );
}
