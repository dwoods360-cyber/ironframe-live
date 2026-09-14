import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260914120000_tenant_scope_worm_storage.sql",
  ),
  "utf8",
);

describe("WORM storage tenant boundary", () => {
  it("provisions the default WORM bucket used by server exports", () => {
    expect(migration).toContain("'evidence-locker-worm'");
  });

  it("requires authenticated storage paths to match a database tenant assignment", () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "epic12_worm_dedicated_insert"');
    expect(migration).toContain('DROP POLICY IF EXISTS "epic12_worm_dedicated_select"');
    expect(migration).toContain("public.user_role_assignments");
    expect(migration).toContain("assignment.user_id = auth.uid()::text");
    expect(migration).toContain("assignment.tenant_id::text = p_tenant_id");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain("public.ironframe_storage_member((storage.foldername(name))[2])");
  });

  it("denies authenticated updates and deletes with restrictive policies", () => {
    expect(migration).toMatch(/AS RESTRICTIVE\s+FOR UPDATE[\s\S]*USING \(false\)/);
    expect(migration).toMatch(/AS RESTRICTIVE\s+FOR DELETE[\s\S]*USING \(false\)/);
  });
});
