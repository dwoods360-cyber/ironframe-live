-- Sprint 6.2: Ironchaos global config (AgentOperation may already exist from 6.1)

CREATE TABLE "ChaosConfig" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "failureRate" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaosConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ChaosConfig" ("id", "isActive", "failureRate", "updatedAt")
VALUES ('global', false, 0.35, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
