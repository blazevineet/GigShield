-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVE', 'EXPIRING', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'AUTO_APPROVED', 'SOFT_HOLD', 'HARD_HOLD', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('HEAVY_RAINFALL', 'EXTREME_HEAT', 'FLOOD_ALERT', 'SEVERE_AQI', 'ORDER_COLLAPSE', 'CURFEW_BANDH');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('WORKER', 'ADMIN', 'INSURER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "aadhaarHash" TEXT,
    "name" TEXT NOT NULL,
    "upiId" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'WORKER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Chennai',
    "avgDailyHours" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "tenureMonths" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "basePremium" DOUBLE PRECISION NOT NULL,
    "finalPremium" DOUBLE PRECISION NOT NULL,
    "maxPayout" DOUBLE PRECISION NOT NULL,
    "coverageHours" INTEGER NOT NULL DEFAULT 8,
    "mlScore" DOUBLE PRECISION,
    "mlMultiplier" DOUBLE PRECISION,
    "status" "PolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "renewedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "triggerType" "TriggerType" NOT NULL,
    "triggerValue" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "bcsScore" DOUBLE PRECISION,
    "bcsBreakdown" JSONB,
    "payoutAmount" DOUBLE PRECISION NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "autoTriggered" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "adjusterNotes" TEXT,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "upiId" TEXT NOT NULL,
    "razorpayOrderId" TEXT,
    "razorpayPayoutId" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'QUEUED',
    "failureReason" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_pings" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gps_pings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trigger_events" (
    "id" TEXT NOT NULL,
    "triggerType" "TriggerType" NOT NULL,
    "zone" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "rawPayload" JSONB,
    "claimsRaised" INTEGER NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trigger_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone_risk_profiles" (
    "id" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "floodRiskIndex" DOUBLE PRECISION NOT NULL,
    "claimFrequency" DOUBLE PRECISION NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zone_risk_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "worker_profiles_userId_key" ON "worker_profiles"("userId");

-- CreateIndex
CREATE INDEX "worker_profiles_zone_idx" ON "worker_profiles"("zone");

-- CreateIndex
CREATE INDEX "worker_profiles_platform_idx" ON "worker_profiles"("platform");

-- CreateIndex
CREATE INDEX "policies_workerId_idx" ON "policies"("workerId");

-- CreateIndex
CREATE INDEX "policies_status_idx" ON "policies"("status");

-- CreateIndex
CREATE INDEX "policies_expiresAt_idx" ON "policies"("expiresAt");

-- CreateIndex
CREATE INDEX "claims_policyId_idx" ON "claims"("policyId");

-- CreateIndex
CREATE INDEX "claims_status_idx" ON "claims"("status");

-- CreateIndex
CREATE INDEX "claims_triggerType_idx" ON "claims"("triggerType");

-- CreateIndex
CREATE INDEX "claims_firedAt_idx" ON "claims"("firedAt");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_claimId_key" ON "payouts"("claimId");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE INDEX "gps_pings_workerId_recordedAt_idx" ON "gps_pings"("workerId", "recordedAt");

-- CreateIndex
CREATE INDEX "trigger_events_triggerType_recordedAt_idx" ON "trigger_events"("triggerType", "recordedAt");

-- CreateIndex
CREATE INDEX "trigger_events_zone_idx" ON "trigger_events"("zone");

-- CreateIndex
CREATE INDEX "otp_requests_userId_idx" ON "otp_requests"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "zone_risk_profiles_zone_key" ON "zone_risk_profiles"("zone");

-- AddForeignKey
ALTER TABLE "worker_profiles" ADD CONSTRAINT "worker_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "worker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_pings" ADD CONSTRAINT "gps_pings_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "worker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_requests" ADD CONSTRAINT "otp_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
