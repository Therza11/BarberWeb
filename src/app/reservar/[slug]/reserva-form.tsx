"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select } from "@/components/ui/field";

type Barbero = { id: string; nombre: string };
type Servicio = {
  id: string;
  nombre: string;
  duracionMin: number;
  precio: string;
  aDomicilio: boolean;
};

type Props = {
  barberos: Barbero[];
  servicios: Servicio[];
};

type Confirmacion = {
  token: string;
  fecha: string;
  hora: string;
};

export function ReservaForm({ barberos, servicios }: Props) {
  const [barberoId, setBarberoId] = useState(barberos[0]?.id ?? "");
  const [servicioId, setServicioId] = useState(servicios[0]?.id ?? "");
  const [fecha, setFecha] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [hora, setHora] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [direccionCliente, setDireccionCliente] = useState("");
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);

  const servicioSeleccionado = servicios.find((s) => s.id === servicioId);

  async function buscarSlots(nuevaFecha: string) {
    setFecha(nuevaFecha);
    setHora("");
    setSlots([]);
    setError(null);

    if (!nuevaFecha || !barberoId || !servicioId) return;

    setCargandoSlots(true);
    try {
      const res = await fetch(
        `/api/disponibilidad?barberoId=${barberoId}&servicioId=${servicioId}&fecha=${nuevaFecha}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo cargar la disponibilidad");
        return;
      }
      setSlots(data.slots);
    } catch {
      setError("No se pudo cargar la disponibilidad");
    } finally {
      setCargandoSlots(false);
    }
  }

  async function reservar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberoId,
          servicioId,
          fecha,
          hora,
          clienteNombre,
          clienteTelefono,
          clienteEmail,
          direccionCliente: servicioSeleccionado?.aDomicilio ? direccionCliente : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la reserva");
        if (res.status === 409) {
          await buscarSlots(fecha);
        }
        return;
      }

      setConfirmacion({ token: data.token, fecha: data.fecha, hora: data.hora });
    } catch {
      setError("No se pudo crear la reserva");
    } finally {
      setEnviando(false);
    }
  }

  if (confirmacion) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-2xl text-success">
          ✓
        </div>
        <p className="mt-4 font-display text-xl font-semibold">Turno confirmado</p>
        <p className="mt-1 text-fg-muted">
          {confirmacion.fecha} a las {confirmacion.hora}
        </p>
        <p className="mt-4 text-sm text-fg-muted">
          Te mandamos la confirmación por email. Guardá este link para cancelar o
          reprogramar tu turno:
        </p>
        <a
          className="mt-2 block break-all rounded-md border border-border bg-bg-elevated px-3 py-2 font-mono text-xs text-accent"
          href={`/reserva/${confirmacion.token}`}
        >
          /reserva/{confirmacion.token}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={reservar} className="flex flex-col gap-4">
      <Field>
        <Label>Barbero</Label>
        <Select
          value={barberoId}
          onChange={(e) => {
            setBarberoId(e.target.value);
            if (fecha) buscarSlots(fecha);
          }}
        >
          {barberos.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre}
            </option>
          ))}
        </Select>
      </Field>

      <Field>
        <Label>Servicio</Label>
        <Select
          value={servicioId}
          onChange={(e) => {
            setServicioId(e.target.value);
            if (fecha) buscarSlots(fecha);
          }}
        >
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre} ({s.duracionMin} min) - ${s.precio}
              {s.aDomicilio ? " · a domicilio" : ""}
            </option>
          ))}
        </Select>
      </Field>

      <Field>
        <Label>Fecha</Label>
        <Input
          type="date"
          value={fecha}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => buscarSlots(e.target.value)}
        />
      </Field>

      {cargandoSlots && <p className="text-sm text-fg-muted">Buscando horarios...</p>}

      {fecha && !cargandoSlots && (
        <div className="flex flex-wrap gap-2">
          {slots.length === 0 && (
            <p className="text-sm text-fg-muted">No hay horarios libres ese día.</p>
          )}
          {slots.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setHora(s)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                hora === s
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border text-fg-muted hover:border-accent hover:text-accent"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {hora && (
        <>
          <Field>
            <Label>Nombre</Label>
            <Input
              required
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
            />
          </Field>

          <Field>
            <Label>Teléfono</Label>
            <Input
              required
              value={clienteTelefono}
              onChange={(e) => setClienteTelefono(e.target.value)}
            />
          </Field>

          <Field>
            <Label>Email</Label>
            <Input
              type="email"
              required
              value={clienteEmail}
              onChange={(e) => setClienteEmail(e.target.value)}
            />
          </Field>

          {servicioSeleccionado?.aDomicilio && (
            <Field>
              <Label>Dirección para el servicio a domicilio</Label>
              <Input
                required
                value={direccionCliente}
                onChange={(e) => setDireccionCliente(e.target.value)}
              />
            </Field>
          )}
        </>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={!hora || enviando} className="mt-2 w-full">
        {enviando ? "Reservando..." : "Confirmar turno"}
      </Button>
    </form>
  );
}
