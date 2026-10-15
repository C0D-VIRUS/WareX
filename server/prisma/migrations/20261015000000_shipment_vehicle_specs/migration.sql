-- Distinguish order confirmation from an actual inventory reservation.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RESERVED';

-- Store the validated shipment package measurements used for vehicle selection.
ALTER TABLE "Shipment"
  ADD COLUMN "packageWeightKg" DOUBLE PRECISION,
  ADD COLUMN "packageLengthCm" DOUBLE PRECISION,
  ADD COLUMN "packageWidthCm" DOUBLE PRECISION,
  ADD COLUMN "packageHeightCm" DOUBLE PRECISION,
  ADD COLUMN "estimatedDistanceKm" DOUBLE PRECISION;

-- Backfill usable defaults for existing fleet records so older vehicles remain selectable.
ALTER TABLE "Vehicle"
  ADD COLUMN "maxWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 1000,
  ADD COLUMN "maxLengthCm" DOUBLE PRECISION NOT NULL DEFAULT 300,
  ADD COLUMN "maxWidthCm" DOUBLE PRECISION NOT NULL DEFAULT 160,
  ADD COLUMN "maxHeightCm" DOUBLE PRECISION NOT NULL DEFAULT 160,
  ADD COLUMN "operatingCostPerKm" DOUBLE PRECISION NOT NULL DEFAULT 12,
  ADD COLUMN "energyUsePerKm" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
  ADD COLUMN "averageSpeedKmph" DOUBLE PRECISION NOT NULL DEFAULT 35;

-- Backfill each existing vehicle from its existing capacity field before applying demo-specific values.
UPDATE "Vehicle"
SET "maxWeightKg" = GREATEST("capacity"::DOUBLE PRECISION, 1000)
WHERE "maxWeightKg" = 1000;

-- Existing demo van: set realistic values for a medium delivery vehicle.
UPDATE "Vehicle"
SET "maxWeightKg" = GREATEST("capacity"::DOUBLE PRECISION, 1200),
    "maxLengthCm" = 350,
    "maxWidthCm" = 180,
    "maxHeightCm" = 190,
    "operatingCostPerKm" = 16,
    "energyUsePerKm" = 0.24,
    "averageSpeedKmph" = 32
WHERE "registrationNo" = 'MH14-WRX-01';


-- Persist warehouse-to-warehouse stock transfers instead of keeping them in browser state.
ALTER TYPE "StockTransactionType" ADD VALUE IF NOT EXISTS 'TRANSFER_OUT';
ALTER TYPE "StockTransactionType" ADD VALUE IF NOT EXISTS 'TRANSFER_IN';
CREATE TYPE "TransferStatus" AS ENUM ('REQUESTED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');

CREATE TABLE "WarehouseTransfer" (
  "id" UUID NOT NULL,
  "transferId" TEXT NOT NULL,
  "status" "TransferStatus" NOT NULL DEFAULT 'REQUESTED',
  "fromWarehouseId" UUID NOT NULL,
  "toWarehouseId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "dispatchedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WarehouseTransfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WarehouseTransferItem" (
  "id" UUID NOT NULL,
  "transferId" UUID NOT NULL,
  "skuId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "WarehouseTransferItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WarehouseTransfer_transferId_key" ON "WarehouseTransfer"("transferId");
CREATE INDEX "WarehouseTransfer_fromWarehouseId_idx" ON "WarehouseTransfer"("fromWarehouseId");
CREATE INDEX "WarehouseTransfer_toWarehouseId_idx" ON "WarehouseTransfer"("toWarehouseId");
CREATE INDEX "WarehouseTransfer_createdById_idx" ON "WarehouseTransfer"("createdById");
CREATE INDEX "WarehouseTransfer_status_idx" ON "WarehouseTransfer"("status");
CREATE UNIQUE INDEX "WarehouseTransferItem_transferId_skuId_key" ON "WarehouseTransferItem"("transferId", "skuId");
CREATE INDEX "WarehouseTransferItem_skuId_idx" ON "WarehouseTransferItem"("skuId");

ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseTransferItem" ADD CONSTRAINT "WarehouseTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "WarehouseTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseTransferItem" ADD CONSTRAINT "WarehouseTransferItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
