import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { enviarWhatsapp } from "@/lib/notificaciones/whatsapp";
import { obtenerAppUrl } from "@/lib/notificaciones/mensajes";
import { parsearFechaNatural } from "@/lib/fecha-natural";
import {
  SlotNoDisponibleError,
  crearReserva,
  obtenerSlotsLibres,
  parseFechaColumna,
} from "@/lib/reservas";

// Bot de reservas por WhatsApp (v2.4) - un solo numero de WhatsApp para toda
// la plataforma (mismo criterio que la cuenta unica de Wompi: pedirle a cada
// barberia su propia cuenta de Meta Business verificada seria demasiada
// friccion). Sin IA/NLU: menus numerados deterministicos, para que funcione
// hoy mismo en modo simulado (sin credenciales de Meta) y sea facil de
// testear con curl. Solo cubre reservar un turno nuevo - cancelar/reprogramar
// sigue siendo por el link con token que ya manda el email de confirmacion.
//
// Estado de la conversacion persiste en ConversacionWhatsapp (una fila por
// numero de telefono/wa_id). Una conversacion sin actividad por mas de
// CONVERSACION_TIMEOUT_MIN se descarta y arranca de cero.

const CONVERSACION_TIMEOUT_MIN = 60;
const MAX_SLOTS_LISTADOS = 12;

type DatosConversacion = {
  negociosOfrecidos?: string[]; // slugs, en el orden mostrado
  serviciosOfrecidos?: string[]; // ids, en el orden mostrado
  servicioId?: string;
  servicioNombre?: string;
  barberosOfrecidos?: string[]; // ids, en el orden mostrado
  barberoId?: string;
  barberoNombre?: string;
  fecha?: string; // "YYYY-MM-DD"
  slotsOfrecidos?: string[]; // horas "HH:mm", en el orden mostrado
  hora?: string;
  nombre?: string;
};

function extraerNumero(texto: string): number | null {
  const m = texto.match(/\d+/);
  return m ? Number(m[0]) : null;
}

function elegirDeLista<T>(texto: string, lista: T[]): T | null {
  const n = extraerNumero(texto);
  if (n === null || n < 1 || n > lista.length) return null;
  return lista[n - 1];
}

async function guardar(telefono: string, cambios: { estado?: string; negocioId?: string | null; datos?: DatosConversacion }) {
  await prisma.conversacionWhatsapp.update({
    where: { telefono },
    data: {
      ...(cambios.estado !== undefined ? { estado: cambios.estado } : {}),
      ...(cambios.negocioId !== undefined ? { negocioId: cambios.negocioId } : {}),
      ...(cambios.datos !== undefined ? { datos: cambios.datos as Prisma.InputJsonValue } : {}),
    },
  });
}

async function listarServiciosYAvanzar(telefono: string, negocioId: string): Promise<void> {
  const servicios = await prisma.servicio.findMany({
    where: { negocioId, activo: true },
    select: { id: true, nombre: true, duracionMin: true, precio: true },
    orderBy: { nombre: "asc" },
  });

  if (servicios.length === 0) {
    await enviarWhatsapp(telefono, "Esta barbería todavía no cargó servicios. Probá más tarde.");
    await guardar(telefono, { estado: "INICIO", negocioId: null, datos: {} });
    return;
  }

  const lineas = servicios.map(
    (s, i) => `${i + 1}. ${s.nombre} (${s.duracionMin} min) - $${s.precio}`,
  );
  await enviarWhatsapp(
    telefono,
    `¿Qué servicio querés?\n${lineas.join("\n")}\n\nRespondé con el número.`,
  );
  await guardar(telefono, {
    estado: "ELEGIR_SERVICIO",
    negocioId,
    datos: { serviciosOfrecidos: servicios.map((s) => s.id) },
  });
}

async function listarBarberosYAvanzar(
  telefono: string,
  negocioId: string,
  datos: DatosConversacion,
): Promise<void> {
  const barberos = await prisma.barbero.findMany({
    where: { negocioId, activo: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  if (barberos.length === 0) {
    await enviarWhatsapp(telefono, "Esta barbería no tiene barberos disponibles ahora.");
    await guardar(telefono, { estado: "INICIO", negocioId: null, datos: {} });
    return;
  }

  const lineas = barberos.map((b, i) => `${i + 1}. ${b.nombre}`);
  await enviarWhatsapp(telefono, `¿Con qué barbero?\n${lineas.join("\n")}\n\nRespondé con el número.`);
  await guardar(telefono, {
    estado: "ELEGIR_BARBERO",
    datos: { ...datos, barberosOfrecidos: barberos.map((b) => b.id) },
  });
}

async function pedirFecha(telefono: string, datos: DatosConversacion): Promise<void> {
  await enviarWhatsapp(
    telefono,
    "¿Qué día? Escribí una fecha (2026-10-15), 'hoy', 'mañana' o un día de la semana (ej: viernes).",
  );
  await guardar(telefono, { estado: "ELEGIR_FECHA", datos });
}

async function buscarNegocioPorTexto(texto: string) {
  const candidatosSlug = new Set<string>();
  const matchSlug = texto.match(/reservar\s+en\s+([a-z0-9-]+)/i);
  if (matchSlug) candidatosSlug.add(matchSlug[1].toLowerCase());

  // Tambien acepta que manden el slug "pelado" (ej. tocaron un link que solo
  // precargaba el slug, o lo escribieron directo sin el "reservar en").
  const comoSlug = texto.trim().toLowerCase().replace(/\s+/g, "-");
  if (/^[a-z0-9-]+$/.test(comoSlug)) candidatosSlug.add(comoSlug);

  for (const slug of candidatosSlug) {
    const negocio = await prisma.negocio.findFirst({
      where: { slug, activo: true },
      select: { id: true, slug: true, nombre: true },
    });
    if (negocio) return { unico: negocio, opciones: [] as typeof negocio[] };
  }

  const nombreBuscado = texto.trim();
  if (nombreBuscado.length < 2) return { unico: null, opciones: [] };

  const opciones = await prisma.negocio.findMany({
    where: { activo: true, nombre: { contains: nombreBuscado, mode: "insensitive" } },
    select: { id: true, slug: true, nombre: true },
    take: 8,
  });

  if (opciones.length === 1) return { unico: opciones[0], opciones: [] };
  return { unico: null, opciones };
}

export async function procesarMensajeWhatsapp(telefono: string, textoCrudo: string): Promise<void> {
  const texto = textoCrudo.trim();
  const textoNorm = texto.toLowerCase();

  if (textoNorm === "reiniciar") {
    await prisma.conversacionWhatsapp.upsert({
      where: { telefono },
      create: { telefono, estado: "INICIO", datos: {} },
      update: { estado: "INICIO", negocioId: null, datos: {} },
    });
    await enviarWhatsapp(
      telefono,
      "Listo, empezamos de nuevo. ¿En qué barbería querés reservar? Escribime el nombre.",
    );
    return;
  }

  if (/cancelar|reprogramar|mis turnos/.test(textoNorm)) {
    await enviarWhatsapp(
      telefono,
      "Para cancelar o reprogramar un turno ya reservado, usá el link que te mandamos por email cuando lo confirmaste.",
    );
    return;
  }

  let conversacion = await prisma.conversacionWhatsapp.upsert({
    where: { telefono },
    create: { telefono, estado: "INICIO", datos: {} },
    update: {},
  });

  const vencida =
    Date.now() - conversacion.actualizadoEn.getTime() > CONVERSACION_TIMEOUT_MIN * 60_000;
  if (vencida) {
    conversacion = await prisma.conversacionWhatsapp.update({
      where: { telefono },
      data: { estado: "INICIO", negocioId: null, datos: {} },
    });
  }

  const datos = (conversacion.datos as DatosConversacion) ?? {};

  try {
    switch (conversacion.estado) {
      case "INICIO": {
        if (/^(hola|buen[oa]s?(\s*(dias|d[ií]as|tardes|noches))?|hi|hey)[\s!.]*$/i.test(texto)) {
          await enviarWhatsapp(telefono, "¡Hola! ¿En qué barbería querés reservar? Escribime el nombre.");
          return;
        }

        const { unico, opciones } = await buscarNegocioPorTexto(texto);

        if (unico) {
          await listarServiciosYAvanzar(telefono, unico.id);
          return;
        }

        if (opciones.length > 1) {
          const lineas = opciones.map((n, i) => `${i + 1}. ${n.nombre}`);
          await enviarWhatsapp(
            telefono,
            `Encontré varias barberías con ese nombre:\n${lineas.join("\n")}\n\nRespondé con el número.`,
          );
          await guardar(telefono, {
            estado: "ELEGIR_NEGOCIO",
            datos: { negociosOfrecidos: opciones.map((n) => n.slug) },
          });
          return;
        }

        await enviarWhatsapp(
          telefono,
          "No encontré ninguna barbería con ese nombre. Probá escribirlo de nuevo, o pedile el link de WhatsApp a tu barbería.",
        );
        return;
      }

      case "ELEGIR_NEGOCIO": {
        const slug = elegirDeLista(texto, datos.negociosOfrecidos ?? []);
        if (!slug) {
          await enviarWhatsapp(telefono, "Elegí uno de los números de la lista, por favor.");
          return;
        }
        const negocio = await prisma.negocio.findFirst({
          where: { slug, activo: true },
          select: { id: true },
        });
        if (!negocio) {
          await enviarWhatsapp(telefono, "Esa barbería ya no está disponible. Escribí 'reiniciar' para empezar de nuevo.");
          await guardar(telefono, { estado: "INICIO", negocioId: null, datos: {} });
          return;
        }
        await listarServiciosYAvanzar(telefono, negocio.id);
        return;
      }

      case "ELEGIR_SERVICIO": {
        const servicioId = elegirDeLista(texto, datos.serviciosOfrecidos ?? []);
        if (!servicioId || !conversacion.negocioId) {
          await enviarWhatsapp(telefono, "Elegí uno de los números de la lista, por favor.");
          return;
        }
        const servicio = await prisma.servicio.findUnique({
          where: { id: servicioId },
          select: { nombre: true, aDomicilio: true },
        });
        if (!servicio) {
          await enviarWhatsapp(telefono, "Ese servicio ya no está disponible. Escribí 'reiniciar' para empezar de nuevo.");
          await guardar(telefono, { estado: "INICIO", negocioId: null, datos: {} });
          return;
        }
        if (servicio.aDomicilio) {
          await enviarWhatsapp(
            telefono,
            "Ese servicio es a domicilio y necesita tu dirección, así que por ahora reservalo desde la web de la barbería.",
          );
          await guardar(telefono, { estado: "INICIO", negocioId: null, datos: {} });
          return;
        }
        await listarBarberosYAvanzar(telefono, conversacion.negocioId, {
          ...datos,
          servicioId,
          servicioNombre: servicio.nombre,
        });
        return;
      }

      case "ELEGIR_BARBERO": {
        const barberoId = elegirDeLista(texto, datos.barberosOfrecidos ?? []);
        if (!barberoId) {
          await enviarWhatsapp(telefono, "Elegí uno de los números de la lista, por favor.");
          return;
        }
        const barbero = await prisma.barbero.findUnique({
          where: { id: barberoId },
          select: { nombre: true },
        });
        if (!barbero) {
          await enviarWhatsapp(telefono, "Ese barbero ya no está disponible. Escribí 'reiniciar' para empezar de nuevo.");
          await guardar(telefono, { estado: "INICIO", negocioId: null, datos: {} });
          return;
        }
        await pedirFecha(telefono, { ...datos, barberoId, barberoNombre: barbero.nombre });
        return;
      }

      case "ELEGIR_FECHA": {
        const fecha = parsearFechaNatural(texto);
        if (!fecha) {
          await enviarWhatsapp(
            telefono,
            "No entendí esa fecha. Probá con 'mañana', 'viernes' o 2026-10-15.",
          );
          return;
        }
        if (!datos.barberoId || !datos.servicioId) {
          await enviarWhatsapp(telefono, "Algo se perdió en el camino. Escribí 'reiniciar' para empezar de nuevo.");
          return;
        }

        const resultado = await obtenerSlotsLibres({
          barberoId: datos.barberoId,
          servicioId: datos.servicioId,
          fecha: parseFechaColumna(fecha),
        });

        if ("error" in resultado) {
          await enviarWhatsapp(telefono, "Algo se perdió en el camino. Escribí 'reiniciar' para empezar de nuevo.");
          return;
        }

        if (resultado.slots.length === 0) {
          await enviarWhatsapp(telefono, "No hay horarios libres ese día. Probá con otra fecha.");
          return;
        }

        const slotsAMostrar = resultado.slots.slice(0, MAX_SLOTS_LISTADOS);
        const lineas = slotsAMostrar.map((s, i) => `${i + 1}. ${s}`);
        const nota =
          resultado.slots.length > MAX_SLOTS_LISTADOS
            ? `\n\n(hay más horarios disponibles ese día; elegí uno de estos o probá otra fecha)`
            : "";
        await enviarWhatsapp(
          telefono,
          `Horarios disponibles el ${fecha}:\n${lineas.join("\n")}${nota}\n\nRespondé con el número.`,
        );
        await guardar(telefono, {
          estado: "ELEGIR_HORA",
          datos: { ...datos, fecha, slotsOfrecidos: slotsAMostrar },
        });
        return;
      }

      case "ELEGIR_HORA": {
        const hora = elegirDeLista(texto, datos.slotsOfrecidos ?? []);
        if (!hora) {
          await enviarWhatsapp(telefono, "Elegí uno de los números de la lista, por favor.");
          return;
        }
        await enviarWhatsapp(telefono, "¿A nombre de quién hacemos la reserva?");
        await guardar(telefono, { estado: "PEDIR_NOMBRE", datos: { ...datos, hora } });
        return;
      }

      case "PEDIR_NOMBRE": {
        if (texto.length < 2) {
          await enviarWhatsapp(telefono, "Necesito un nombre para la reserva.");
          return;
        }
        await enviarWhatsapp(telefono, "¿Cuál es tu email? Lo usamos para mandarte la confirmación.");
        await guardar(telefono, { estado: "PEDIR_EMAIL", datos: { ...datos, nombre: texto } });
        return;
      }

      case "PEDIR_EMAIL": {
        if (!/^\S+@\S+\.\S+$/.test(texto)) {
          await enviarWhatsapp(telefono, "Ese email no parece válido. Probá de nuevo.");
          return;
        }

        if (
          !datos.barberoId ||
          !datos.servicioId ||
          !datos.fecha ||
          !datos.hora ||
          !datos.nombre ||
          !conversacion.negocioId
        ) {
          await enviarWhatsapp(telefono, "Algo se perdió en el camino. Escribí 'reiniciar' para empezar de nuevo.");
          await guardar(telefono, { estado: "INICIO", negocioId: null, datos: {} });
          return;
        }

        const negocio = await prisma.negocio.findUnique({
          where: { id: conversacion.negocioId },
          select: { requiereSena: true, slug: true },
        });

        if (negocio?.requiereSena) {
          await enviarWhatsapp(
            telefono,
            `Esta barbería pide una seña para reservar, así que necesitás hacerlo desde la web: ${obtenerAppUrl()}/reservar/${negocio.slug}`,
          );
          await guardar(telefono, { estado: "INICIO", negocioId: null, datos: {} });
          return;
        }

        try {
          const reserva = await crearReserva({
            barberoId: datos.barberoId,
            servicioId: datos.servicioId,
            fecha: parseFechaColumna(datos.fecha),
            hora: datos.hora,
            clienteNombre: datos.nombre,
            clienteTelefono: telefono,
            clienteEmail: texto,
          });

          await enviarWhatsapp(
            telefono,
            `¡Listo! Turno confirmado el ${datos.fecha} a las ${datos.hora} con ${datos.barberoNombre} (${datos.servicioNombre}).\n\nPara cancelar o reprogramar: ${obtenerAppUrl()}/reserva/${reserva.token}`,
          );
          await guardar(telefono, { estado: "INICIO", negocioId: null, datos: {} });
        } catch (error) {
          if (error instanceof SlotNoDisponibleError) {
            await enviarWhatsapp(
              telefono,
              "Uy, justo se ocupó ese horario. Decime otro día y te muestro los horarios de nuevo.",
            );
            await guardar(telefono, {
              estado: "ELEGIR_FECHA",
              datos: { ...datos, fecha: undefined, hora: undefined, slotsOfrecidos: undefined },
            });
            return;
          }
          throw error;
        }
        return;
      }

      default: {
        await guardar(telefono, { estado: "INICIO", negocioId: null, datos: {} });
        await enviarWhatsapp(telefono, "¡Hola! ¿En qué barbería querés reservar? Escribime el nombre.");
      }
    }
  } catch (error) {
    console.error("Error en el bot de WhatsApp:", error);
    await enviarWhatsapp(
      telefono,
      "Uy, algo salió mal de mi lado. Escribí 'reiniciar' para empezar de nuevo.",
    );
  }
}
