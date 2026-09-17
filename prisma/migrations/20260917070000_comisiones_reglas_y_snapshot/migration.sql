-- DropForeignKey
ALTER TABLE "comisiones" DROP CONSTRAINT "comisiones_reservaId_fkey";

-- DropIndex
DROP INDEX "comisiones_reservaId_key";

-- AlterTable
ALTER TABLE "comisiones" DROP COLUMN "montoCalculado",
DROP COLUMN "reservaId";

-- AlterTable
ALTER TABLE "reservas" ADD COLUMN     "comisionMonto" DECIMAL(10,2),
ADD COLUMN     "comisionMontoFijo" DECIMAL(10,2),
ADD COLUMN     "comisionPorcentaje" DECIMAL(5,2);

-- CreateIndex
CREATE UNIQUE INDEX "comisiones_barberoId_servicioId_key" ON "comisiones"("barberoId", "servicioId");
