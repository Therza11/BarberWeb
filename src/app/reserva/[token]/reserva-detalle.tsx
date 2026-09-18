"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EstadoBadge } from "@/components/ui/badge";
import { Field, Input, Label } from "@/components/ui/field";

type Reserva = {
  barberoId: string;
  servicioId: string;
  fecha: string;
  hora: string;
  estado: string;
  clienteNombre: string;
  direccionCliente: string | null;
  negocio: string;
  barbero: string;
  servicio: string;
  duracionMin: number;
  precio: string;
};

const ESTADOS_ACTIVOS = ["PENDIENTE", "CONFIRMADA"];

export function ReservaDetalle({ token }: { token: string }) {
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accion, setAccion] = useState<null | "cancelar" | "reprogramar">(null);

  const [nuevaFecha, setNuevaFecha] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [nuevaHora, setNuevaHora] = useState("");
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function cargarReserva() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservas/${token}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo cargar la reserva");
        return;
      }
      setReserva(data);
    } catch {
      setError("No se pudo cargar la reserva");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    cargarReserva();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function buscarSlots(fecha: string) {
    if (!reserva) return;
    setNuevaFecha(fecha);
    setNuevaHora("");
    setSlots([]);
    if (!fecha) return;

    setCargandoSlots(true);
    try {
      const res = await fetch(
        `/api/disponibilidad?barberoId=${reserva.barberoId}&servicioId=${reserva.servicioId}&fecha=${fecha}`,
      );
      const data = await res.json();
      if (res.ok) setSlots(data.slots);
    } finally {
      setCargandoSlots(false);
    }
  }

  async function confirmarCancelacion() {
    setEnviando(true);
    setMensaje(null);
    try {
      const res = await fetch(`/api/reservas/${token}/cancelar`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMensaje(data.error ?? "No se pudo cancelar la reserva");
        return;
      }
      await cargarReserva();
      setAccion(null);
      setMensaje("Turno cancelado.");
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarReprogramacion() {
    setEnviando(true);
    setMensaje(null);
    try {
      const res = await fetch(`/api/reservas/${token}/reprogramar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: nuevaFecha, hora: nuevaHora }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMensaje(data.error ?? "No se pudo reprogramar la reserva");
        if (res.status === 409) await buscarSlots(nuevaFecha);
        return;
      }
      await cargarReserva();
      setAccion(null);
      setMensaje("Turno reprogramado.");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <p className="text-fg-muted">Cargando...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!reserva) return null;

  const activa = ESTADOS_ACTIVOS.includes(reserva.estado);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">{reserva.negocio}</h1>

      <Card className="mt-4 flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-fg-muted">Estado</span>
          <EstadoBadge estado={reserva.estado} />
        </div>
        <Row label="Cliente" value={reserva.clienteNombre} />
        <Row label="Barbero" value={reserva.barbero} />
        <Row label="Servicio" value={`${reserva.servicio} (${reserva.duracionMin} min) - $${reserva.precio}`} />
        <Row label="Fecha" value={`${reserva.fecha} a las ${reserva.hora}`} />
        {reserva.direccionCliente && (
          <Row label="Dirección" value={reserva.direccionCliente} />
        )}
      </Card>

      {mensaje && <p className="mt-4 text-sm text-fg-muted">{mensaje}</p>}

      {activa && accion === null && (
        <div className="mt-4 flex gap-2">
          <Button variant="danger" onClick={() => setAccion("cancelar")}>
            Cancelar turno
          </Button>
          <Button variant="outline" onClick={() => setAccion("reprogramar")}>
            Reprogramar
          </Button>
        </div>
      )}

      {accion === "cancelar" && (
        <Card className="mt-4 border-danger/30">
          <p className="text-sm">¿Confirmás que querés cancelar este turno?</p>
          <div className="mt-3 flex gap-2">
            <Button variant="danger" disabled={enviando} onClick={confirmarCancelacion}>
              Sí, cancelar
            </Button>
            <Button variant="ghost" onClick={() => setAccion(null)}>
              Volver
            </Button>
          </div>
        </Card>
      )}

      {accion === "reprogramar" && (
        <Card className="mt-4">
          <Field>
            <Label>Nueva fecha</Label>
            <Input
              type="date"
              value={nuevaFecha}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => buscarSlots(e.target.value)}
            />
          </Field>

          {cargandoSlots && (
            <p className="mt-2 text-sm text-fg-muted">Buscando horarios...</p>
          )}

          {nuevaFecha && !cargandoSlots && (
            <div className="mt-3 flex flex-wrap gap-2">
              {slots.length === 0 && (
                <p className="text-sm text-fg-muted">No hay horarios libres ese día.</p>
              )}
              {slots.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setNuevaHora(s)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    nuevaHora === s
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border text-fg-muted hover:border-accent hover:text-accent"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button disabled={!nuevaHora || enviando} onClick={confirmarReprogramacion}>
              Confirmar nuevo horario
            </Button>
            <Button variant="ghost" onClick={() => setAccion(null)}>
              Volver
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-fg-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
