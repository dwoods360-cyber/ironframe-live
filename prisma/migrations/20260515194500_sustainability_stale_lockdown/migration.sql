-- Irontech (Agent 12): 24h stale-data lockdown tracking + tripartite waiver flag.
ALTER TABLE "SystemConfig" ADD COLUMN "sustainability_api_degraded_since" TIMESTAMP(3);
ALTER TABLE "SystemConfig" ADD COLUMN "sustainability_stale_lockdown_waived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemConfig" ADD COLUMN "sustainability_stale_lockdown_witness_at" TIMESTAMP(3);
