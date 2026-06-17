-- Epic 12: immutable WORM guard on ThreatEvent (DORA Pillar 5 — no UPDATE/DELETE).
-- Maintenance bypass: SET LOCAL app.worm_threat_event_bypass = '1' (transaction-scoped).

CREATE OR REPLACE FUNCTION epic12_threat_event_worm_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(current_setting('app.worm_threat_event_bypass', true), '') = '1' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF COALESCE(current_setting('app.worm_threat_event_enforced', true), '') <> '1' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'CRITICAL COMPLIANCE VIOLATION: ThreatEvent log records are protected by immutable WORM storage rules under DORA Pillar 5. Deletion or modification is strictly barred.';
END;
$$;

DROP TRIGGER IF EXISTS epic12_threat_event_worm_guard_trigger ON "ThreatEvent";

CREATE TRIGGER epic12_threat_event_worm_guard_trigger
  BEFORE UPDATE OR DELETE ON "ThreatEvent"
  FOR EACH ROW
  EXECUTE FUNCTION epic12_threat_event_worm_guard();
