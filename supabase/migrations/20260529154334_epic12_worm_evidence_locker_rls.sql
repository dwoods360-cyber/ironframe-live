-- Epic 12: WORM evidence locker bucket + deny-delete/update via RLS (no DELETE/UPDATE policies)
-- Applied on Ironframe-GRC (kcuciqpxxrqjmqcpulmq) via Supabase MCP / dashboard migration epic12_worm_evidence_locker_rls

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('evidence-locker', 'evidence-locker', false, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "epic12_worm_insert" ON storage.objects;
DROP POLICY IF EXISTS "epic12_worm_select" ON storage.objects;

-- Append-only: authenticated may INSERT into WORM path prefixes only
CREATE POLICY "epic12_worm_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'evidence-locker'
  AND (storage.foldername(name))[1] IN ('worm', 'incident-reports')
);

-- Read sealed artifacts (path must be under WORM prefixes)
CREATE POLICY "epic12_worm_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'evidence-locker'
  AND (storage.foldername(name))[1] IN ('worm', 'incident-reports')
);

-- No UPDATE or DELETE policies: RLS denies mutations on evidence-locker objects by default.
-- service_role (server uploads) bypasses RLS per Supabase platform behavior.
