-- Manual constitutional rebaseline — clears stuck Ironlock latch fields on SystemConfig.
-- Run against preview/production when TAS.md is valid but UI still shows CONSTITUTIONAL VOID.
-- Safe to re-run; does not delete security_posture.

UPDATE "SystemConfig"
SET
  "state_freeze_active" = false,
  "state_freeze_escalated_at" = NULL,
  "state_freeze_voice_dispatched_at" = NULL,
  "emergency_seal" = NULL
WHERE id = 'global'
  AND (
    "state_freeze_active" = true
    OR "emergency_seal"::text IN ('"DUAL_LOCK"', '"TRIPARTITE_LOCK"', 'DUAL_LOCK', 'TRIPARTITE_LOCK')
    OR "state_freeze_escalated_at" IS NOT NULL
  );

-- Optional: resolve an armed dead-man switch (JSON must match your deployed schema).
-- UPDATE "SystemConfig"
-- SET "dead_man_switch" = jsonb_set(
--   COALESCE("dead_man_switch", '{}'::jsonb),
--   '{resolvedAt}',
--   to_jsonb(now()::text)
-- )
-- WHERE id = 'global' AND ("dead_man_switch"->>'armedAt') IS NOT NULL;
