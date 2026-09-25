-- CreateEnum
CREATE TYPE "PlanNegocio" AS ENUM ('GRATIS', 'PRO');

-- AlterTable
ALTER TABLE "negocios" ADD COLUMN     "plan" "PlanNegocio" NOT NULL DEFAULT 'GRATIS';
