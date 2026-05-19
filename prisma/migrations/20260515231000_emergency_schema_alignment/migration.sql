-- Agent 12 / Agent 7: State Freeze escalation persistence (PagerDuty + Twilio ladder audit anchors).
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "state_freeze_escalated_at" TIMESTAMP(3);
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "state_freeze_voice_dispatched_at" TIMESTAMP(3);
