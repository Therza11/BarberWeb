
-- CreateEnum
CREATE TYPE "EstadoListaEspera" AS ENUM ('ACTIVA', 'NOTIFICADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "lista_espera" (
    "id" TEXT NOT NULL,
    "barberoId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "clienteNombre" TEXT NOT NULL,
    "clienteTelefono" TEXT NOT NULL,
    "clienteEmail" TEXT NOT NULL,
    "estado" "EstadoListaEspera" NOT NULL DEFAULT 'ACTIVA',
    "token" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificadoEn" TIMESTAMP(3),

    CONSTRAINT "lista_espera_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lista_espera_token_key" ON "lista_espera"("token");

-- CreateIndex
CREATE INDEX "lista_espera_barberoId_fecha_estado_idx" ON "lista_espera"("barberoId", "fecha", "estado");

-- AddForeignKey
ALTER TABLE "lista_espera" ADD CONSTRAINT "lista_espera_barberoId_fkey" FOREIGN KEY ("barberoId") REFERENCES "barberos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_espera" ADD CONSTRAINT "lista_espera_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

