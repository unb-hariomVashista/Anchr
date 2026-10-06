/*
  Warnings:

  - You are about to drop the `MrpDiscountRule` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "actorId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "after" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "before" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "entityId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "entityType" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "requestId" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MrpDiscountRule";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "campaignId" TEXT,
    "title" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "code" TEXT,
    "valueType" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT 'ALL',
    "targetIds" TEXT,
    "floorType" TEXT,
    "floorValue" REAL,
    "minQuantity" INTEGER,
    "minSubtotal" REAL,
    "combinesWith" TEXT,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "shopifyDiscountId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "lastSyncError" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Discount_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Campaign_shop_status_idx" ON "Campaign"("shop", "status");

-- CreateIndex
CREATE INDEX "Campaign_shop_startsAt_idx" ON "Campaign"("shop", "startsAt");

-- CreateIndex
CREATE INDEX "Discount_shop_status_idx" ON "Discount"("shop", "status");

-- CreateIndex
CREATE INDEX "Discount_campaignId_idx" ON "Discount"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Discount_shop_code_key" ON "Discount"("shop", "code");

-- CreateIndex
CREATE INDEX "AuditLog_shop_timestamp_idx" ON "AuditLog"("shop", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_shop_entityType_entityId_idx" ON "AuditLog"("shop", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_shop_level_timestamp_idx" ON "AuditLog"("shop", "level", "timestamp");
