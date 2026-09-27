"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select } from "@/components/ui/field";
import { StarsDisplay } from "@/components/ui/stars";
import { ListaEsperaForm } from "./lista-espera-form";

type Barbero = {
  id: string;
  nombre: string;
  sucursalId: string | null;
  promedio: number | null;
  cantidadResenas: number;
};
type Sucursal = { id: string; nombre: string; direccion: string | null; ciudad: string | null };
type Servicio = {
  id: string;
  nombre: string;
  duracionMin: number;
  precio: string;
  aDomicilio: boolean;
};

type Props = {
  barberos: Barbero[];
  sucursales: Sucursal[];
  servicios: Servicio[];
  permiteRecurrente: boolean;
};

type Confirmacion = {
  token: string;
  fecha: string;
  hora: string;
};

type ConfirmacionSerie = {
  serieId: string;
  cantidad: number;
};

const INTERVALOS_SEMANAS = [1, 2, 3, 4, 6, 8];
const CANTIDADES_OCURRENCIAS = [2, 3, 4, 6, 8, 12];

export function ReservaForm({ barberos, sucursales, servicios, permiteRecurrente }: Props) {
  const [sucursalId, setSucursalId] = useState(sucursales[0]?.id ?? "");
  const barberosFiltrados =
    sucursales.length === 0
      ? barberos
      : barberos.filter((b) => !b.sucursalId || b.sucursalId === sucursalId);
  const [barberoId, setBarberoId] = useState(barberosFiltrados[0]?.id ?? "");
  const [servicioId, setServicioId] = useState(servicios[0]?.id ?? "");
  const [fecha, setFecha] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [hora, setHora] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [direccionCliente, setDireccionCliente] = useState("");
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const solicitudIdRef = useRef(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const [confirmacionSerie, setConfirmacionSerie] = useState<ConfirmacionSerie | null>(null);

  const [recurrente, setRecurrente] = useState(false);
  const [intervaloSemanas, setIntervaloSemanas] = useState(4);
  const [cantidadOcurrencias, setCantidadOcurrencias] = useState(4);

  const servicioSeleccionado = servicios.find((s) => s.id === servicioId);
  const barberoSeleccionado = barberos.find((b) => b.id === barberoId);

  async function buscarSlots(
    nuevaFecha: string,
    overrides?: { barberoId?: string; servicioId?: string },
  ) {
    setFecha(nuevaFecha);
    setHora("");
    setSlots([]);
    setError(null);

    const idBarbero = overrides?.barberoId ?? barberoId;
    const idServicio = overrides?.servicioId ?? servicioId;

    if (!nuevaFecha || !idBarbero || !idServicio) return;

    // Un input de fecha nativo puede disparar varios onChange seguidos
    // mientras se completa (un dia se puede escribir de a un digito por
    // segmento) y esos fetches pueden resolver fuera de orden. Este id
    // descarta cualquier respuesta que no sea la de la ultima solicitud en
    // curso, para que una mas vieja no pise el resultado correcto.
    const idSolicitud = ++solicitudIdRef.current;
    setCargandoSlots(true);
    try {
      const res = await fetch(
        `/api/disponibilidad?barberoId=${idBarbero}&servicioId=${idServicio}&fecha=${nuevaFecha}`,
      );
      const data = await res.json();
      if (idSolicitud !== solicitudIdRef.current) return;
      if (!res.ok) {
        setError(data.error ?? "No se pudo cargar la disponibilidad");
        return;
      }
      setSlots(data.slots);
    } catch {
      if (idSolicitud === solicitudIdRef.current) {
        setError("No se pudo cargar la disponibilidad");
      }
    } finally {
      if (idSolicitud === solicitudIdRef.current) {
        setCargandoSlots(false);
      }
    }
  }

  async function reservar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    const datosBase = {
      barberoId,
      servicioId,
      fecha,
      hora,
      clienteNombre,
      clienteTelefono,
      clienteEmail,
      direccionCliente: servicioSeleccionado?.aDomicilio ? direccionCliente : undefined,
    };

    try {
      const res = await fetch(
        recurrente ? "/api/reservas/recurrente" : "/api/reservas",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            recurrente ? { ...datosBase, intervaloSemanas, cantidadOcurrencias } : datosBase,
          ),
        },
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la reserva");
        if (res.status === 409) {
          await buscarSlots(fecha);
        }
        return;
      }

      if (data.pagoUrl) {
        window.location.href = data.pagoUrl;
        return;
      }

      if (recurrente) {
        setConfirmacionSerie({ serieId: data.serieId, cantidad: data.ocurrencias.length });
        return;
      }

      setConfirmacion({ token: data.token, fecha: data.fecha, hora: data.hora });
    } catch {
      setError("No se pudo crear la reserva");
    } finally {
      setEnviando(false);
    }
  }

  if (confirmacionSerie) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-2xl text-success">
          ✓
        </div>
        <p className="mt-4 font-display text-xl font-semibold">
          {confirmacionSerie.cantidad} turnos confirmados
        </p>
        <p className="mt-4 text-sm text-fg-muted">
          Te mandamos la confirmación por email. Guardá este link para ver todas las
          fechas y cancelar o reprogramar cada una:
        </p>
        <a
          className="mt-2 block break-all rounded-md border border-border bg-bg-elevated px-3 py-2 font-mono text-xs text-accent"
          href={`/reserva/serie/${confirmacionSerie.serieId}`}
        >
          /reserva/serie/{confirmacionSerie.serieId}
        </a>
      </div>
    );
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
      {sucursales.length > 0 && (
        <Field>
          <Label>Sede</Label>
          <Select
            value={sucursalId}
            onChange={(e) => {
              const nuevaSucursalId = e.target.value;
              setSucursalId(nuevaSucursalId);
              const disponibles = barberos.filter(
                (b) => !b.sucursalId || b.sucursalId === nuevaSucursalId,
              );
              const nuevoBarberoId = disponibles[0]?.id ?? "";
              setBarberoId(nuevoBarberoId);
              if (fecha) buscarSlots(fecha, { barberoId: nuevoBarberoId });
            }}
          >
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
                {s.direccion ? ` — ${s.direccion}` : ""}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field>
        <Label>Barbero</Label>
        <Select
          value={barberoId}
          onChange={(e) => {
            setBarberoId(e.target.value);
            if (fecha) buscarSlots(fecha, { barberoId: e.target.value });
          }}
        >
          {barberosFiltrados.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre}
              {b.promedio ? ` — ★${b.promedio.toFixed(1)} (${b.cantidadResenas})` : ""}
            </option>
          ))}
        </Select>
        {barberoSeleccionado && (
          <div className="mt-1">
            <StarsDisplay
              promedio={barberoSeleccionado.promedio}
              cantidad={barberoSeleccionado.cantidadResenas}
            />
          </div>
        )}
      </Field>

      <Field>
        <Label>Servicio</Label>
        <Select
          value={servicioId}
          onChange={(e) => {
            setServicioId(e.target.value);
            if (fecha) buscarSlots(fecha, { servicioId: e.target.value });
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

      {fecha && !cargandoSlots && slots.length === 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg-muted">No hay horarios libres ese día.</p>
          <ListaEsperaForm
            key={`${barberoId}-${servicioId}-${fecha}`}
            barberoId={barberoId}
            servicioId={servicioId}
            fecha={fecha}
          />
        </div>
      )}

      {fecha && !cargandoSlots && slots.length > 0 && (
        <div className="flex flex-wrap gap-2">
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

          {permiteRecurrente && (
            <div className="rounded-md border border-border p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={recurrente}
                  onChange={(e) => setRecurrente(e.target.checked)}
                />
                Repetir este turno periódicamente
              </label>

              {recurrente && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <Field>
                    <Label>Cada</Label>
                    <Select
                      value={intervaloSemanas}
                      onChange={(e) => setIntervaloSemanas(Number(e.target.value))}
                    >
                      {INTERVALOS_SEMANAS.map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? "semana" : "semanas"}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field>
                    <Label>Cantidad de turnos</Label>
                    <Select
                      value={cantidadOcurrencias}
                      onChange={(e) => setCantidadOcurrencias(Number(e.target.value))}
                    >
                      {CANTIDADES_OCURRENCIAS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={!hora || enviando} className="mt-2 w-full">
        {enviando
          ? "Reservando..."
          : recurrente
            ? `Confirmar ${cantidadOcurrencias} turnos`
            : "Confirmar turno"}
      </Button>
    </form>
  );
}
