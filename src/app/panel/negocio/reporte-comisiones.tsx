"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

type Fila = {
  id: string;
  fecha: string;
  hora: string;
  clienteNombre: string;
  barbero: string;
  servicio: string;
  precio: string;
  comisionMonto: string | null;
};

export function ReporteComisiones() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/panel/reportes")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setFilas(data);
      })
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p className="mt-4 text-sm text-fg-muted">Cargando...</p>;

  if (filas.length === 0) {
    return (
      <Card className="mt-4">
        <p className="text-sm text-fg-muted">Todavía no hay turnos completados.</p>
      </Card>
    );
  }

  const total = filas.reduce((acc, f) => acc + Number(f.comisionMonto ?? 0), 0);

  return (
    <Card className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-fg-muted">
            <th className="py-1 font-normal">Fecha</th>
            <th className="font-normal">Barbero</th>
            <th className="font-normal">Servicio</th>
            <th className="font-normal">Cliente</th>
            <th className="text-right font-normal">Precio</th>
            <th className="text-right font-normal">Comisión</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id} className="border-b border-border">
              <td className="py-2">
                {f.fecha} {f.hora}
              </td>
              <td>{f.barbero}</td>
              <td>{f.servicio}</td>
              <td>{f.clienteNombre}</td>
              <td className="text-right">${f.precio}</td>
              <td className="text-right text-accent">
                {f.comisionMonto ? `$${f.comisionMonto}` : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-right text-sm font-medium">
        Total comisiones: <span className="text-accent">${total.toFixed(2)}</span>
      </p>
    </Card>
  );
}
