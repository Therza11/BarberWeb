"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Label } from "@/components/ui/field";

type Ajustes = {
  plan: string;
  dominioPersonalizado: string | null;
  requiereSena: boolean;
  senaPorcentaje: string | null;
};

export function AjustesPanel() {
  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const [cargando, setCargando] = useState(true);

  const [dominio, setDominio] = useState("");
  const [guardandoDominio, setGuardandoDominio] = useState(false);
  const [errorDominio, setErrorDominio] = useState<string | null>(null);
  const [okDominio, setOkDominio] = useState(false);

  const [requiereSena, setRequiereSena] = useState(false);
  const [senaPorcentaje, setSenaPorcentaje] = useState("30");
  const [guardandoSena, setGuardandoSena] = useState(false);
  const [errorSena, setErrorSena] = useState<string | null>(null);
  const [okSena, setOkSena] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/panel/negocio");
      const data = await res.json();
      if (res.ok && data) {
        setAjustes(data);
        setDominio(data.dominioPersonalizado ?? "");
        setRequiereSena(data.requiereSena);
        if (data.senaPorcentaje) setSenaPorcentaje(data.senaPorcentaje);
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    cargar();
  }, []);

  async function guardarDominio(e: React.FormEvent) {
    e.preventDefault();
    setErrorDominio(null);
    setOkDominio(false);
    setGuardandoDominio(true);
    try {
      const res = await fetch("/api/panel/negocio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dominioPersonalizado: dominio || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorDominio(data.error ?? "No se pudo guardar el dominio");
        return;
      }
      setOkDominio(true);
      await cargar();
    } finally {
      setGuardandoDominio(false);
    }
  }

  async function guardarSena(e: React.FormEvent) {
    e.preventDefault();
    setErrorSena(null);
    setOkSena(false);
    setGuardandoSena(true);
    try {
      const res = await fetch("/api/panel/negocio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requiereSena,
          senaPorcentaje: requiereSena ? Number(senaPorcentaje) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorSena(data.error ?? "No se pudo guardar la configuración de seña");
        return;
      }
      setOkSena(true);
      await cargar();
    } finally {
      setGuardandoSena(false);
    }
  }

  if (cargando || !ajustes) return <p className="text-sm text-fg-muted">Cargando...</p>;

  const esPro = ajustes.plan === "PRO";

  if (!esPro) {
    return (
      <p className="text-xs text-fg-muted">
        Dominio propio y seña con Wompi son funciones del plan Pro.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h3 className="font-display text-sm font-semibold">Dominio propio</h3>
        <p className="mt-1 text-xs text-fg-muted">
          Apuntá un subdominio tuyo (ej. turnos.tunegocio.com) a esta app con un
          registro CNAME hacia cname.vercel-dns.com, y avisale al operador para
          que lo agregue en Vercel. Después cargalo acá.
        </p>
        <form onSubmit={guardarDominio} className="mt-3 flex flex-wrap items-end gap-3">
          <Field>
            <Label>Dominio</Label>
            <Input
              placeholder="turnos.tunegocio.com"
              value={dominio}
              onChange={(e) => setDominio(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={guardandoDominio}>
            Guardar
          </Button>
        </form>
        {errorDominio && <p className="mt-2 text-sm text-danger">{errorDominio}</p>}
        {okDominio && !errorDominio && (
          <p className="mt-2 text-sm text-success">Guardado.</p>
        )}
      </Card>

      <Card>
        <h3 className="font-display text-sm font-semibold">Seña con Wompi</h3>
        <p className="mt-1 text-xs text-fg-muted">
          Si la activás, tus clientes pagan un porcentaje del servicio al reservar
          (Nequi/tarjeta vía Wompi) para reducir las ausencias. El turno se
          confirma automáticamente cuando Wompi aprueba el pago.
        </p>
        <form onSubmit={guardarSena} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requiereSena}
              onChange={(e) => setRequiereSena(e.target.checked)}
            />
            Pedir seña al reservar
          </label>
          {requiereSena && (
            <Field>
              <Label>Porcentaje del servicio</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={senaPorcentaje}
                onChange={(e) => setSenaPorcentaje(e.target.value)}
              />
            </Field>
          )}
          <Button type="submit" disabled={guardandoSena}>
            Guardar
          </Button>
        </form>
        {errorSena && <p className="mt-2 text-sm text-danger">{errorSena}</p>}
        {okSena && !errorSena && <p className="mt-2 text-sm text-success">Guardado.</p>}
      </Card>
    </div>
  );
}
