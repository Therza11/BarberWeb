import { prisma } from "@/lib/prisma";
import { enviarEmail } from "@/lib/notificaciones/email";
import { obtenerAppUrl } from "@/lib/notificaciones/mensajes";

// Se llama al cancelar una reserva (y al reprogramar, para la fecha vieja
// que quedo libre). No reserva nada: solo le avisa por email a cada
// ACTIVA de ese barbero+servicio+fecha, en orden de anotacion, y las pasa a
// NOTIFICADA (no se vuelve a avisar el mismo dia). El cliente tiene que
// entrar a reservar como cualquiera - a la carrera contra otros clientes
// que reciban el mismo aviso, o contra alguien que reserve directo.
export async function notificarListaEspera(barberoId: string, servicioId: string, fecha: Date) {
  const entradas = await prisma.listaEspera.findMany({
    where: { barberoId, servicioId, fecha, estado: "ACTIVA" },
    orderBy: { creadoEn: "asc" },
    include: {
      barbero: { select: { nombre: true, negocio: { select: { nombre: true, slug: true } } } },
      servicio: { select: { nombre: true } },
    },
  });

  let notificadas = 0;

  for (const entrada of entradas) {
    const fechaStr = entrada.fecha.toISOString().slice(0, 10);
    const link = `${obtenerAppUrl()}/reservar/${entrada.barbero.negocio.slug}`;
    const mensaje = `Hola ${entrada.clienteNombre}! Se liberó un turno el ${fechaStr} con ${entrada.barbero.nombre} (${entrada.servicio.nombre}) en ${entrada.barbero.negocio.nombre}. Reservalo antes de que se lo lleve otra persona: ${link}`;

    try {
      await enviarEmail(entrada.clienteEmail, "Se liberó un turno", mensaje);
      await prisma.listaEspera.update({
        where: { id: entrada.id },
        data: { estado: "NOTIFICADA", notificadoEn: new Date() },
      });
      notificadas++;
    } catch (error) {
      // Si falla el envio, la dejamos ACTIVA para reintentar en la proxima
      // cancelacion de ese mismo dia (no hay cron dedicado a reintentar esto).
      console.error("Error notificando lista de espera:", error);
    }
  }

  return { notificadas };
}
