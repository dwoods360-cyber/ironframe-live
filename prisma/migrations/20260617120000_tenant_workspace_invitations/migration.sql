-- CreateTable
CREATE TABLE "tenant_workspace_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_hash" TEXT NOT NULL,
    "email" TEXT,
    "tenant_slug" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_by_operator" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_workspace_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_workspace_invitations_token_hash_key" ON "tenant_workspace_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "tenant_workspace_invitations_status_expires_at_idx" ON "tenant_workspace_invitations"("status", "expires_at");
