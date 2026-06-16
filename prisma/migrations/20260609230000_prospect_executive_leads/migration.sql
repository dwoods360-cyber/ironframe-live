-- Executive lead aggregation — sales-assisted prospect tracking (BigInt ALE cents).

CREATE TABLE "prospects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reported_ale" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prospects_slug_key" ON "prospects"("slug");

CREATE INDEX "prospects_created_at_idx" ON "prospects"("created_at");

CREATE INDEX "prospects_email_idx" ON "prospects"("email");
