// Parseo de fechas en lenguaje natural simple para el bot de WhatsApp - sin
// IA/NLU, solo texto literal YYYY-MM-DD, "hoy", "mañana" y nombres de dia de
// la semana (siempre la PROXIMA ocurrencia, incluyendo hoy mismo si coincide
// el dia y todavia se puede reservar). Devuelve la fecha en formato
// "YYYY-MM-DD" local (no UTC) o null si no se pudo interpretar.

function indiceDia(nombre: string): number | null {
  const normalizado = nombre.toLowerCase();
  const mapa: Record<string, number> = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miercoles: 3,
    "miércoles": 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
    "sábado": 6,
  };
  return normalizado in mapa ? mapa[normalizado] : null;
}

function formatearFecha(d: Date): string {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export function parsearFechaNatural(texto: string, ahora: Date = new Date()): string | null {
  const t = texto.trim().toLowerCase();

  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  // "dd/mm" o "dd/mm/yyyy"
  const matchBarra = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (matchBarra) {
    const dia = Number(matchBarra[1]);
    const mes = Number(matchBarra[2]);
    const anio = matchBarra[3] ? Number(matchBarra[3]) : ahora.getFullYear();
    const fecha = new Date(anio, mes - 1, dia);
    if (fecha.getMonth() === mes - 1) return formatearFecha(fecha);
    return null;
  }

  if (t === "hoy") return formatearFecha(ahora);

  if (t === "mañana" || t === "manana") {
    const d = new Date(ahora);
    d.setDate(d.getDate() + 1);
    return formatearFecha(d);
  }

  const diaBuscado = indiceDia(t.replace(/^(el|los|proximo|próximo)\s+/, ""));
  if (diaBuscado !== null) {
    const d = new Date(ahora);
    const actual = d.getDay();
    let delta = diaBuscado - actual;
    if (delta <= 0) delta += 7; // siempre la proxima ocurrencia, no hoy
    d.setDate(d.getDate() + delta);
    return formatearFecha(d);
  }

  return null;
}

