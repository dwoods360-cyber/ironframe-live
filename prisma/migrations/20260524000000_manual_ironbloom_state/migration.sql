-- CreateTable
CREATE TABLE "gridcore_carbon_coefficients" (
    "tenant_id" UUID NOT NULL,
    "zone" TEXT NOT NULL,
    "carbon_intensity_grams" BIGINT NOT NULL,
    "carbon_intensity_gco2_per_kwh" DOUBLE PRECISION NOT NULL,
    "renewable_percentage" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "polled_at" TIMESTAMP(3) NOT NULL,
    "telemetry_fingerprint" TEXT NOT NULL,
    CONSTRAINT "gridcore_carbon_coefficients_pkey" PRIMARY KEY ("tenant_id","zone")
);

-- CreateTable
CREATE TABLE "carbon_pulse_samples" (
    "tenant_id" UUID NOT NULL,
    "id" TEXT NOT NULL,
    "sampled_at" TIMESTAMP(3) NOT NULL,
    "zone" TEXT NOT NULL,
    "gco2_per_kwh" DOUBLE PRECISION NOT NULL,
    "mitigated_value_cents" BIGINT NOT NULL,
    "dirty" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "carbon_pulse_samples_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "dirty_grid_alerts" (
    "tenant_id" UUID NOT NULL,
    "id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL,
    "intensity_gco2_per_kwh" DOUBLE PRECISION NOT NULL,
    "threshold_gco2_per_kwh" DOUBLE PRECISION NOT NULL,
    "tenant_usage_kwh" DOUBLE PRECISION NOT NULL,
    "usage_baseline_kwh" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "evidence_artifact_sha256" TEXT,
    CONSTRAINT "dirty_grid_alerts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "ironlock_carbon_throttles" (
    "tenant_id" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "intensity_gco2_per_kwh" DOUBLE PRECISION NOT NULL,
    "threshold_gco2_per_kwh" DOUBLE PRECISION NOT NULL,
    "autonomous_mitigation_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_auto_throttle_audit_at" TIMESTAMP(3),
    CONSTRAINT "ironlock_carbon_throttles_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "ironbloom_utility_rate_caches" (
    "tenant_id" UUID NOT NULL,
    "rate_usd_per_unit" DOUBLE PRECISION NOT NULL,
    "unit_type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "polled_at" TIMESTAMP(3) NOT NULL,
    "last_polled_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ironbloom_utility_rate_caches_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "ironbloom_rate_drift_alerts" (
    "tenant_id" UUID NOT NULL,
    "id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL,
    "previous_rate_usd" DOUBLE PRECISION NOT NULL,
    "new_rate_usd" DOUBLE PRECISION NOT NULL,
    "drift_ratio" DOUBLE PRECISION NOT NULL,
    "unit_type" TEXT NOT NULL,
    "pulse_message" TEXT NOT NULL,
    CONSTRAINT "ironbloom_rate_drift_alerts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "ironbloom_tenant_sync_metas" (
    "tenant_id" UUID NOT NULL,
    "last_synchronized_at" TIMESTAMP(3),
    "last_global_poll_at" TIMESTAMP(3),
    "last_dirty_alert_at" TIMESTAMP(3),
    CONSTRAINT "ironbloom_tenant_sync_metas_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateIndex
CREATE INDEX "carbon_pulse_samples_tenant_id_sampled_at_idx" ON "carbon_pulse_samples"("tenant_id", "sampled_at");

-- AddForeignKey
ALTER TABLE "gridcore_carbon_coefficients" ADD CONSTRAINT "gridcore_carbon_coefficients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_pulse_samples" ADD CONSTRAINT "carbon_pulse_samples_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dirty_grid_alerts" ADD CONSTRAINT "dirty_grid_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ironlock_carbon_throttles" ADD CONSTRAINT "ironlock_carbon_throttles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ironbloom_utility_rate_caches" ADD CONSTRAINT "ironbloom_utility_rate_caches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ironbloom_rate_drift_alerts" ADD CONSTRAINT "ironbloom_rate_drift_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ironbloom_tenant_sync_metas" ADD CONSTRAINT "ironbloom_tenant_sync_metas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
