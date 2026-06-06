-- Executive boardroom session + agent trace ledger (LangGraph drill persistence).

CREATE TABLE "board_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_objective" TEXT NOT NULL,
    "financial_projections_cents" BIGINT NOT NULL,
    "legal_review_cleared" BOOLEAN NOT NULL DEFAULT false,
    "current_active_speaker" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "board_agent_traces" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "assessment_log" TEXT NOT NULL,
    "is_approved" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_agent_traces_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "board_sessions_tenant_id_idx" ON "board_sessions"("tenant_id");
CREATE INDEX "board_agent_traces_session_id_idx" ON "board_agent_traces"("session_id");

ALTER TABLE "board_sessions" ADD CONSTRAINT "board_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "board_agent_traces" ADD CONSTRAINT "board_agent_traces_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "board_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
