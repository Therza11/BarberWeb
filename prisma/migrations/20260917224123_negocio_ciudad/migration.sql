-- AlterTable
ALTER TABLE "negocios" ADD COLUMN     "ciudad" TEXT;

-- CreateIndex
CREATE INDEX "negocios_ciudad_idx" ON "negocios"("ciudad");
