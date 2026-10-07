-- AlterTable
ALTER TABLE "Discount" ADD COLUMN "usageLimit" INTEGER;
ALTER TABLE "Discount" ADD COLUMN "oncePerCustomer" BOOLEAN NOT NULL DEFAULT false;
