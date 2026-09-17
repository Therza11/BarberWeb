-- AlterTable
ALTER TABLE "barberos" ADD COLUMN     "passwordHash" TEXT NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- AlterTable
ALTER TABLE "negocios" ADD COLUMN     "passwordHash" TEXT NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "barberos_email_key" ON "barberos"("email");

-- CreateIndex
CREATE UNIQUE INDEX "negocios_email_key" ON "negocios"("email");
