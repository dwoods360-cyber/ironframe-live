-- Tenant-scoped stakeholder metrics for role dashboards.
CREATE TABLE "stakeholder_metrics" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role_key" TEXT NOT NULL,
    "metric_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stakeholder_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stakeholder_metrics_tenant_id_role_key_key"
    ON "stakeholder_metrics"("tenant_id", "role_key");

CREATE INDEX "stakeholder_metrics_tenant_id_idx"
    ON "stakeholder_metrics"("tenant_id");

ALTER TABLE "stakeholder_metrics"
    ADD CONSTRAINT "stakeholder_metrics_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
