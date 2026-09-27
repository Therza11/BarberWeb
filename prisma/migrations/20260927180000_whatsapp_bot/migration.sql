
-- CreateTable
CREATE TABLE "conversaciones_whatsapp" (
    "id" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "negocioId" TEXT,
    "estado" TEXT NOT NULL,
    "datos" JSONB NOT NULL DEFAULT '{}',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversaciones_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversaciones_whatsapp_telefono_key" ON "conversaciones_whatsapp"("telefono");

-- AddForeignKey
ALTER TABLE "conversaciones_whatsapp" ADD CONSTRAINT "conversaciones_whatsapp_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "negocios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

