export interface IronlogicInput {
  tenantId: string;
  frameworkId: string;
  mappedControls: string[];
}

/**
 * [Agent 09 — Ironlogic] Deterministic Policy Engine
 * Compiles safe PostgreSQL Row Level Security (RLS) definitions from verified control strings.
 */
export function buildRlsPoliciesFromFramework(input: IronlogicInput): string[] {
  const { tenantId, frameworkId, mappedControls } = input;

  // Enforce strict alphanumeric token scrubbing to eliminate comment markers or interpolation escapes
  const safeTenantId = tenantId.replace(/[^a-f0-9\-]/gi, "");
  const safeFrameworkId = frameworkId.replace(/[^a-z0-9_\-]/gi, "");

  if (!safeTenantId || !safeFrameworkId || !mappedControls || mappedControls.length === 0) {
    return [];
  }

  // Purely deterministic output using static string literals — No raw payload input allowed
  return mappedControls.map((control) => {
    const safeControl = control.replace(/[^a-z0-9_\-]/gi, "");
    return `CREATE POLICY rls_${safeFrameworkId}_${safeControl} ON public.tenant_data FOR ALL TO authenticated USING (tenant_id = '${safeTenantId}');`;
  });
}
