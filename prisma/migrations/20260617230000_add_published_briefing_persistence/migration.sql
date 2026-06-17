-- Published briefing persistence for `/api/board/feed` syndication (HITL promotion gate).

CREATE TABLE "published_briefings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "exposure_cents" BIGINT NOT NULL,
    "dora_score" INTEGER NOT NULL DEFAULT 100,
    "published_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "published_briefings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "published_briefings_slug_key" ON "published_briefings"("slug");

CREATE INDEX "published_briefings_tenant_id_idx" ON "published_briefings"("tenant_id");

ALTER TABLE "published_briefings"
    ADD CONSTRAINT "published_briefings_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
