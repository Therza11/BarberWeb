
-- AlterTable
ALTER TABLE "reservas" ADD COLUMN     "serieId" TEXT,
ADD COLUMN     "serieIndice" INTEGER,
ADD COLUMN     "serieTotal" INTEGER;

-- CreateIndex
CREATE INDEX "reservas_serieId_idx" ON "reservas"("serieId");

