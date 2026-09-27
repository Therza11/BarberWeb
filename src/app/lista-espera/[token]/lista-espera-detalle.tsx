"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EstadoBadge } from "@/components/ui/badge";

type Entrada = {
  estado: string;
  fecha: string;
  clienteNombre: string;
  negocio: string;
  negocioSlug: string;
  barbero: string;
  servicio: string;
};

const TEXTOS: Record<string, string> = {
  ACTIVA: "Te vamos a avisar por email si se libera un turno ese día.",
  NOTIFICADA: "¡Se liberó un turno! Entrá a reservar antes de que se lo lleve otra persona.",
  CANCELADA: "Te diste de baja de esta lista de espera.",
};

export function ListaEsperaDetalle({ token }: { token: string }) {
  const router = useRouter();
  const [entrada, setEntrada] = useState<Entrada | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dandoBaja, setDandoBaja] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch(`/api/lista-espera/${token}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo cargar la lista de espera");
        return;
      }
      setEntrada(data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function darDeBaja() {
    setDandoBaja(true);
    try {
      await fetch(`/api/lista-espera/${token}`, { method: "DELETE" });
      await cargar();
    } finally {
      setDandoBaja(false);
    }
  }

  if (cargando) return <p className="text-fg-muted">Cargando...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!entrada) return null;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">{entrada.negocio}</h1>

      <Card className="mt-4 flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-fg-muted">Estado</span>
          <EstadoBadge estado={entrada.estado} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-fg-muted">Barbero</span>
          <span>{entrada.barbero}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-fg-muted">Servicio</span>
          <span>{entrada.servicio}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-fg-muted">Fecha</span>
          <span>{entrada.fecha}</span>
        </div>
      </Card>

      <p className="mt-4 text-sm text-fg-muted">{TEXTOS[entrada.estado]}</p>

      {entrada.estado === "NOTIFICADA" && (
        <Button className="mt-4 w-full" onClick={() => router.push(`/reservar/${entrada.negocioSlug}`)}>
          Ir a reservar
        </Button>
      )}

      {entrada.estado === "ACTIVA" && (
        <Button variant="outline" className="mt-4 w-full" disabled={dandoBaja} onClick={darDeBaja}>
          {dandoBaja ? "Dando de baja..." : "Ya no quiero esperar"}
        </Button>
      )}
    </div>
  );
}
