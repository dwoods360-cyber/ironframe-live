-- One-time archival: legacy orphan ThreatEvent rows lacking verified ingress provenance.
-- Mirrors threatEventVerifiedIngestionProvenanceWhere() in app/utils/activeThreatsBoardQuery.ts:
--   sourcePlane ∈ {CHAOS, MANUAL, AGENT_DISCOVERY} AND non-empty threadId / orchestrationThreadId.
-- Note: ThreatState has no ACTIVE — non-terminal board-eligible statuses are archived here.

UPDATE "ThreatEvent"
SET "status" = 'CLOSED_ARCHIVED',
    "updatedAt" = NOW()
WHERE "status" IN ('CONFIRMED', 'MITIGATED', 'IDENTIFIED', 'PIPELINE')
  AND (
    "ingestionDetails" IS NULL
    OR NOT (
      (
        "ingestionDetails" ILIKE '%"sourcePlane": "CHAOS"%'
        OR "ingestionDetails" ILIKE '%"sourcePlane":"CHAOS"%'
        OR "ingestionDetails" ILIKE '%"sourcePlane": "MANUAL"%'
        OR "ingestionDetails" ILIKE '%"sourcePlane":"MANUAL"%'
        OR "ingestionDetails" ILIKE '%"sourcePlane": "AGENT_DISCOVERY"%'
        OR "ingestionDetails" ILIKE '%"sourcePlane":"AGENT_DISCOVERY"%'
      )
      AND (
        "ingestionDetails" ILIKE '%"threadId": "%'
        OR "ingestionDetails" ILIKE '%"threadId":"%'
        OR "ingestionDetails" ILIKE '%"orchestrationThreadId": "%'
        OR "ingestionDetails" ILIKE '%"orchestrationThreadId":"%'
      )
    )
  );
