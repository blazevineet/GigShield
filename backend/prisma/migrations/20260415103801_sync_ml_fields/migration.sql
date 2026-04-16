/*
  Warnings:

  - You are about to drop the column `adjusterNotes` on the `claims` table. All the data in the column will be lost.
  - You are about to drop the column `bcsBreakdown` on the `claims` table. All the data in the column will be lost.
  - You are about to drop the column `bcsScore` on the `claims` table. All the data in the column will be lost.
  - You are about to drop the column `accuracy` on the `gps_pings` table. All the data in the column will be lost.
  - You are about to drop the column `altitude` on the `gps_pings` table. All the data in the column will be lost.
  - You are about to drop the column `speed` on the `gps_pings` table. All the data in the column will be lost.
  - You are about to drop the column `razorpayOrderId` on the `payouts` table. All the data in the column will be lost.
  - You are about to drop the column `rawPayload` on the `trigger_events` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ClaimStatus" ADD VALUE 'SETTLED';
ALTER TYPE "ClaimStatus" ADD VALUE 'MANUAL_REVIEW';

-- DropIndex
DROP INDEX "claims_firedAt_idx";

-- DropIndex
DROP INDEX "claims_triggerType_idx";

-- DropIndex
DROP INDEX "policies_expiresAt_idx";

-- AlterTable
ALTER TABLE "claims" DROP COLUMN "adjusterNotes",
DROP COLUMN "bcsBreakdown",
DROP COLUMN "bcsScore",
ADD COLUMN     "aiConfidence" DOUBLE PRECISION,
ADD COLUMN     "alerts" TEXT[],
ADD COLUMN     "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "settledAt" TIMESTAMP(3),
ADD COLUMN     "severity" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "gps_pings" DROP COLUMN "accuracy",
DROP COLUMN "altitude",
DROP COLUMN "speed";

-- AlterTable
ALTER TABLE "payouts" DROP COLUMN "razorpayOrderId",
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "featureBreakdown" JSONB,
ADD COLUMN     "mlExplanation" TEXT;

-- AlterTable
ALTER TABLE "trigger_events" DROP COLUMN "rawPayload";
