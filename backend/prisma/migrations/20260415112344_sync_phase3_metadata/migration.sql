-- AlterTable
ALTER TABLE "claims" ADD COLUMN     "adjusterNotes" TEXT;

-- AlterTable
ALTER TABLE "gps_pings" ADD COLUMN     "accuracy" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "trigger_events" ADD COLUMN     "rawPayload" JSONB;
