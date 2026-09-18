export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function minutosAHora(minutos: number): string {
  const h = Math.floor(minutos / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutos % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function seSuperponen(
  inicioA: number,
  finA: number,
  inicioB: number,
  finB: number,
): boolean {
  return inicioA < finB && inicioB < finA;
}

type VentanaDisponibilidad = {
  horaInicio: string;
  horaFin: string;
};

type ReservaOcupada = {
  hora: string;
  duracionMin: number;
  // Tiempo de traslado a sumar despues de un servicio a domicilio, para no
  // ofrecer turnos que el barbero no llegaria a cumplir (ver Servicio.aDomicilio).
  bufferTrasladoMin?: number;
};

/**
 * Genera los horarios de inicio libres para un servicio de `duracionMin`,
 * dentro de las ventanas de disponibilidad del barbero para ese dia,
 * excluyendo los rangos ya ocupados por otras reservas activas.
 */
export function calcularSlotsLibres(
  ventanas: VentanaDisponibilidad[],
  ocupadas: ReservaOcupada[],
  duracionMin: number,
  pasoMin: number = 15,
  // Tiempo de traslado del NUEVO turno que se esta por ofrecer (si su
  // servicio es a domicilio), para no dejar dos domicilios pegados sin
  // margen para viajar entre uno y otro.
  bufferMin: number = 0,
): string[] {
  const ocupadasRangos = ocupadas.map((r) => {
    const inicio = horaAMinutos(r.hora);
    return { inicio, fin: inicio + r.duracionMin + (r.bufferTrasladoMin ?? 0) };
  });

  const slots: string[] = [];

  for (const ventana of ventanas) {
    const inicioVentana = horaAMinutos(ventana.horaInicio);
    const finVentana = horaAMinutos(ventana.horaFin);

    for (
      let inicioSlot = inicioVentana;
      inicioSlot + duracionMin <= finVentana;
      inicioSlot += pasoMin
    ) {
      const finSlotConBuffer = inicioSlot + duracionMin + bufferMin;
      const ocupado = ocupadasRangos.some((r) =>
        seSuperponen(inicioSlot, finSlotConBuffer, r.inicio, r.fin),
      );
      if (!ocupado) {
        slots.push(minutosAHora(inicioSlot));
      }
    }
  }

  return slots;
}
