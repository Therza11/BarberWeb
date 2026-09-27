-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('NO_APLICA', 'PENDIENTE', 'PAGADO', 'FALLIDO');

-- AlterTable
ALTER TABLE "barberos" ADD COLUMN     "sucursalId" TEXT;

-- AlterTable
ALTER TABLE "negocios" ADD COLUMN     "dominioPersonalizado" TEXT,
ADD COLUMN     "requiereSena" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "senaPorcentaje" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "reservas" ADD COLUMN     "estadoPago" "EstadoPago" NOT NULL DEFAULT 'NO_APLICA',
ADD COLUMN     "montoSena" DECIMAL(10,2),
ADD COLUMN     "wompiReferencia" TEXT,
ADD COLUMN     "wompiTransaccionId" TEXT;

-- CreateTable
CREATE TABLE "sucursales" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "ciudad" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sucursales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sucursales_negocioId_idx" ON "sucursales"("negocioId");

-- CreateIndex
CREATE INDEX "barberos_sucursalId_idx" ON "barberos"("sucursalId");

-- CreateIndex
CREATE UNIQUE INDEX "negocios_dominioPersonalizado_key" ON "negocios"("dominioPersonalizado");

-- CreateIndex
CREATE UNIQUE INDEX "reservas_wompiReferencia_key" ON "reservas"("wompiReferencia");

-- AddForeignKey
ALTER TABLE "sucursales" ADD CONSTRAINT "sucursales_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "negocios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barberos" ADD CONSTRAINT "barberos_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

