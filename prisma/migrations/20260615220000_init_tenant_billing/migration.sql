-- CreateTable
CREATE TABLE "tenant_billing" (
    "id" TEXT NOT NULL,
    "tenant_slug" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_billing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_billing_tenant_slug_key" ON "tenant_billing"("tenant_slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_billing_stripe_customer_id_key" ON "tenant_billing"("stripe_customer_id");
