-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('PRESENCIAL', 'PARA_LLEVAR', 'DOMICILIO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'PREPARING';
ALTER TYPE "OrderStatus" ADD VALUE 'SERVED';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "order_type" "OrderType" NOT NULL DEFAULT 'PRESENCIAL';
