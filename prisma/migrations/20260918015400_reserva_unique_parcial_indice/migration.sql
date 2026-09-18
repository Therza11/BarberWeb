-- Indice UNICO PARCIAL: un barbero no puede tener dos reservas ACTIVAS
-- (PENDIENTE o CONFIRMADA) en la misma fecha y hora. A diferencia del
-- indice unico simple anterior, este NO cuenta reservas CANCELADA,
-- COMPLETADA o NO_ASISTIO, para que cancelar/completar un turno libere
-- de verdad ese horario para una reserva futura.
-- No representable en el DSL de schema.prisma (no soporta indices
-- parciales) - mantener sincronizado a mano con el modelo Reserva.
CREATE UNIQUE INDEX "reservas_barbero_fecha_hora_activo_key"
  ON "reservas" ("barberoId", "fecha", "hora")
  WHERE "estado" IN ('PENDIENTE', 'CONFIRMADA');
