import { prisma } from "@/lib/prisma";
import { horaAMinutos } from "@/lib/horarios";

export type ResumenReporte = {
  desde: string;
  hasta: string;
  ingresosTotales: string;
  turnosCompletados: number;
  turnosNoAsistio: number;
  tasaAusencia: number; // 0..1
  clientesNuevos: number;
  clientesRecurrentes: number;
  horasPico: { hora: string; cantidad: number }[];
  porBarbero: {
    barberoId: string;
    nombre: string;
    turnos: number;
    ingresos: string;
    comision: string;
  }[];
};

function parseFechaColumna(fechaStr: string): Date {
  const [anio, mes, dia] = fechaStr.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

export async function calcularResumenReporte(
  negocioId: string,
  desdeStr: string,
  hastaStr: string,
): Promise<ResumenReporte> {
  const desde = parseFechaColumna(desdeStr);
  const hasta = parseFechaColumna(hastaStr);

  const turnosRango = await prisma.reserva.findMany({
    where: {
      barbero: { negocioId },
      fecha: { gte: desde, lte: hasta },
      estado: { in: ["COMPLETADA", "NO_ASISTIO"] },
    },
    select: {
      estado: true,
      hora: true,
      clienteEmail: true,
      comisionMonto: true,
      barberoId: true,
      barbero: { select: { nombre: true } },
      servicio: { select: { precio: true } },
    },
  });

  const completados = turnosRango.filter((t) => t.estado === "COMPLETADA");
  const noAsistio = turnosRango.filter((t) => t.estado === "NO_ASISTIO");

  const ingresosTotales = completados.reduce(
    (acc, t) => acc + Number(t.servicio.precio),
    0,
  );

  const tasaAusencia =
    completados.length + noAsistio.length > 0
      ? noAsistio.length / (completados.length + noAsistio.length)
      : 0;

  // Horas pico: agrupa por hora entera (09:15 y 09:45 caen ambas en "09").
  const porHora = new Map<string, number>();
  for (const t of completados) {
    const horaEntera = `${Math.floor(horaAMinutos(t.hora) / 60)
      .toString()
      .padStart(2, "0")}:00`;
    porHora.set(horaEntera, (porHora.get(horaEntera) ?? 0) + 1);
  }
  const horasPico = [...porHora.entries()]
    .map(([hora, cantidad]) => ({ hora, cantidad }))
    .sort((a, b) => a.hora.localeCompare(b.hora));

  // Cliente nuevo = su primer turno completado/no-asistio de siempre cae
  // dentro de este rango. Recurrente = ya tenia alguno antes de "desde".
  // Una consulta por cliente distinto del periodo (N+1 deliberado: el
  // volumen de clientes de una barberia por mes es chico, no justifica una
  // query compuesta mas compleja).
  const clientesEnRango = [...new Set(completados.map((t) => t.clienteEmail))];
  let clientesNuevos = 0;
  let clientesRecurrentes = 0;
  for (const email of clientesEnRango) {
    const tuvoAntes = await prisma.reserva.findFirst({
      where: {
        barbero: { negocioId },
        clienteEmail: email,
        estado: { in: ["COMPLETADA", "NO_ASISTIO"] },
        fecha: { lt: desde },
      },
      select: { id: true },
    });
    if (tuvoAntes) clientesRecurrentes++;
    else clientesNuevos++;
  }

  const porBarberoMap = new Map<
    string,
    { nombre: string; turnos: number; ingresos: number; comision: number }
  >();
  for (const t of completados) {
    const actual = porBarberoMap.get(t.barberoId) ?? {
      nombre: t.barbero.nombre,
      turnos: 0,
      ingresos: 0,
      comision: 0,
    };
    actual.turnos += 1;
    actual.ingresos += Number(t.servicio.precio);
    actual.comision += Number(t.comisionMonto ?? 0);
    porBarberoMap.set(t.barberoId, actual);
  }
  const porBarbero = [...porBarberoMap.entries()]
    .map(([barberoId, v]) => ({
      barberoId,
      nombre: v.nombre,
      turnos: v.turnos,
      ingresos: v.ingresos.toFixed(2),
      comision: v.comision.toFixed(2),
    }))
    .sort((a, b) => Number(b.ingresos) - Number(a.ingresos));

  return {
    desde: desdeStr,
    hasta: hastaStr,
    ingresosTotales: ingresosTotales.toFixed(2),
    turnosCompletados: completados.length,
    turnosNoAsistio: noAsistio.length,
    tasaAusencia,
    clientesNuevos,
    clientesRecurrentes,
    horasPico,
    porBarbero,
  };
}
