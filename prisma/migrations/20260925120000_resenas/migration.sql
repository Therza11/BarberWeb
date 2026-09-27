-- CreateTable
CREATE TABLE "resenas" (
    "id" TEXT NOT NULL,
    "reservaId" TEXT NOT NULL,
    "barberoId" TEXT NOT NULL,
    "calificacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resenas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resenas_reservaId_key" ON "resenas"("reservaId");

-- CreateIndex
CREATE INDEX "resenas_barberoId_idx" ON "resenas"("barberoId");

-- AddForeignKey
ALTER TABLE "resenas" ADD CONSTRAINT "resenas_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "reservas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resenas" ADD CONSTRAINT "resenas_barberoId_fkey" FOREIGN KEY ("barberoId") REFERENCES "barberos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

