-- AlterTable
ALTER TABLE "reservas" ADD COLUMN     "direccionCliente" TEXT;

-- AlterTable
ALTER TABLE "servicios" ADD COLUMN     "aDomicilio" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tiempoTrasladoMin" INTEGER;
