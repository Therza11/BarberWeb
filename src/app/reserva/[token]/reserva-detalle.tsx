"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EstadoBadge } from "@/components/ui/badge";
import { Field, Input, Label } from "@/components/ui/field";
import { StarsInput } from "@/components/ui/stars";

type Reserva = {
  barberoId: string;
  servicioId: string;
  fecha: string;
  hora: string;
  estado: string;
  estadoPago: string;
  montoSena: string | null;
  serieId: string | null;
  serieIndice: number | null;
  serieTotal: number | null;
  clienteNombre: string;
  direccionCliente: string | null;
  negocio: string;
  barbero: string;
  servicio: string;
  duracionMin: number;
  precio: string;
  resena: { calificacion: number; comentario: string | null } | null;
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
  const [pagando, setPagando] = useState(false);

  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviandoResena, setEnviandoResena] = useState(false);
  const [errorResena, setErrorResena] = useState<string | null>(null);

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

  async function enviarResena(e: React.FormEvent) {
    e.preventDefault();
    setErrorResena(null);
    setEnviandoResena(true);
    try {
      const res = await fetch(`/api/reservas/${token}/resena`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calificacion, comentario: comentario || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorResena(data.error ?? "No se pudo enviar la reseña");
        return;
      }
      await cargarReserva();
    } finally {
      setEnviandoResena(false);
    }
  }

  async function irAPagar() {
    setPagando(true);
    setMensaje(null);
    try {
      const res = await fetch(`/api/reservas/${token}/pagar`);
      const data = await res.json();
      if (!res.ok || !data.pagoUrl) {
        setMensaje(data.error ?? "No se pudo generar el link de pago");
        return;
      }
      window.location.href = data.pagoUrl;
    } finally {
      setPagando(false);
    }
  }

  if (cargando) return <p className="text-fg-muted">Cargando...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!reserva) return null;

  const activa = ESTADOS_ACTIVOS.includes(reserva.estado);
  const pagoPendiente = reserva.estado === "PENDIENTE" && reserva.estadoPago === "PENDIENTE";

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">{reserva.negocio}</h1>

      {reserva.serieId && reserva.serieTotal && reserva.serieTotal > 1 && (
        <a href={`/reserva/serie/${reserva.serieId}`} className="mt-1 block text-sm text-accent underline">
          Turno {reserva.serieIndice} de {reserva.serieTotal} de una serie recurrente — ver todos
        </a>
      )}

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
        {reserva.montoSena && (
          <Row
            label="Seña"
            value={`$${reserva.montoSena} — ${
              reserva.estadoPago === "PAGADO"
                ? "pagada"
                : reserva.estadoPago === "FALLIDO"
                  ? "no se pudo cobrar"
                  : "pendiente de pago"
            }`}
          />
        )}
      </Card>

      {pagoPendiente && (
        <Card className="mt-4 border-accent/40">
          <p className="text-sm">
            Tu turno queda reservado por poco tiempo hasta que completes el pago de
            la seña.
          </p>
          <Button className="mt-3" disabled={pagando} onClick={irAPagar}>
            {pagando ? "Generando link..." : "Completar pago"}
          </Button>
        </Card>
      )}

      {reserva.estado === "COMPLETADA" && (
        <Card className="mt-4">
          {reserva.resena ? (
            <div>
              <p className="text-sm font-medium">Tu reseña</p>
              <p className="mt-1 text-accent">
                {"★".repeat(reserva.resena.calificacion)}
                {"☆".repeat(5 - reserva.resena.calificacion)}
              </p>
              {reserva.resena.comentario && (
                <p className="mt-2 text-sm text-fg-muted">{reserva.resena.comentario}</p>
              )}
            </div>
          ) : (
            <form onSubmit={enviarResena}>
              <p className="text-sm font-medium">¿Cómo te fue con {reserva.barbero}?</p>
              <div className="mt-2">
                <StarsInput value={calificacion} onChange={setCalificacion} />
              </div>
              <Field className="mt-3">
                <Label>Comentario (opcional)</Label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
                />
              </Field>
              {errorResena && <p className="mt-2 text-sm text-danger">{errorResena}</p>}
              <Button
                type="submit"
                className="mt-3"
                disabled={calificacion === 0 || enviandoResena}
              >
                {enviandoResena ? "Enviando..." : "Enviar reseña"}
              </Button>
            </form>
          )}
        </Card>
      )}

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
