-- Epic 12: dedicated WORM bucket + financial/forensic path prefixes (append-only RLS)
-- Complements 20260529154334_epic12_worm_evidence_locker_rls.sql

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('evidence-locker-worm', 'evidence-locker-worm', false, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "epic12_worm_dedicated_insert" ON storage.objects;
DROP POLICY IF EXISTS "epic12_worm_dedicated_select" ON storage.objects;

CREATE POLICY "epic12_worm_dedicated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'evidence-locker-worm'
  AND (storage.foldername(name))[1] IN ('worm', 'incident-reports', 'financial', 'forensic')
);

CREATE POLICY "epic12_worm_dedicated_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'evidence-locker-worm'
  AND (storage.foldername(name))[1] IN ('worm', 'incident-reports', 'financial', 'forensic')
);

-- Extend primary evidence-locker bucket policies to financial/forensic prefixes
DROP POLICY IF EXISTS "epic12_worm_insert" ON storage.objects;
DROP POLICY IF EXISTS "epic12_worm_select" ON storage.objects;

CREATE POLICY "epic12_worm_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'evidence-locker'
  AND (storage.foldername(name))[1] IN ('worm', 'incident-reports', 'financial', 'forensic')
);

CREATE POLICY "epic12_worm_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'evidence-locker'
  AND (storage.foldername(name))[1] IN ('worm', 'incident-reports', 'financial', 'forensic')
);

-- No UPDATE or DELETE policies on either bucket: RLS denies mutations by default.
