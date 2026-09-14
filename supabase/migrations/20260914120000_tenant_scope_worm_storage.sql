-- Close the Epic 12 storage boundary: provision both configured buckets and
-- require the authenticated user to hold membership in the tenant encoded in
-- the second object-path segment (<class>/<tenant-uuid>/...).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('evidence-locker', 'evidence-locker', false, NULL, NULL),
  ('evidence-locker-worm', 'evidence-locker-worm', false, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.ironframe_storage_member(p_tenant_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments assignment
    WHERE assignment.user_id = auth.uid()::text
      AND assignment.tenant_id::text = p_tenant_id
  );
$$;

REVOKE ALL ON FUNCTION public.ironframe_storage_member(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ironframe_storage_member(text) TO authenticated;

DROP POLICY IF EXISTS "epic12_worm_insert" ON storage.objects;
DROP POLICY IF EXISTS "epic12_worm_select" ON storage.objects;
DROP POLICY IF EXISTS "epic12_worm_dedicated_insert" ON storage.objects;
DROP POLICY IF EXISTS "epic12_worm_dedicated_select" ON storage.objects;
DROP POLICY IF EXISTS "epic12_worm_tenant_insert" ON storage.objects;
DROP POLICY IF EXISTS "epic12_worm_tenant_select" ON storage.objects;
DROP POLICY IF EXISTS "epic12_worm_deny_update" ON storage.objects;
DROP POLICY IF EXISTS "epic12_worm_deny_delete" ON storage.objects;

CREATE POLICY "epic12_worm_tenant_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  (
    (bucket_id = 'evidence-locker'
      AND (storage.foldername(name))[1] IN ('worm', 'incident-reports'))
    OR
    (bucket_id = 'evidence-locker-worm'
      AND (storage.foldername(name))[1] IN ('worm', 'incident-reports', 'financial', 'forensic'))
  )
  AND public.ironframe_storage_member((storage.foldername(name))[2])
);

CREATE POLICY "epic12_worm_tenant_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  (
    (bucket_id = 'evidence-locker'
      AND (storage.foldername(name))[1] IN ('worm', 'incident-reports'))
    OR
    (bucket_id = 'evidence-locker-worm'
      AND (storage.foldername(name))[1] IN ('worm', 'incident-reports', 'financial', 'forensic'))
  )
  AND public.ironframe_storage_member((storage.foldername(name))[2])
);

-- These restrictive policies remain effective even if another authenticated
-- permissive policy is added later. Server-only service credentials still
-- require provider-side object-lock controls for a complete WORM guarantee.
CREATE POLICY "epic12_worm_deny_update"
ON storage.objects
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "epic12_worm_deny_delete"
ON storage.objects
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);
