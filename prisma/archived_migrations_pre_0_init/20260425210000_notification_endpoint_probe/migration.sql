-- Last connectivity probe (TEST) — failure does not disable the endpoint.
ALTER TABLE "notification_endpoints" ADD COLUMN "last_probe_at" TIMESTAMP(3);
ALTER TABLE "notification_endpoints" ADD COLUMN "last_probe_ok" BOOLEAN;
ALTER TABLE "notification_endpoints" ADD COLUMN "last_probe_detail" VARCHAR(512);
