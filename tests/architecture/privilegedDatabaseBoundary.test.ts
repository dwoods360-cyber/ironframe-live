import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(absolute));
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(absolute);
  }
  return files;
}

describe("privileged database boundary", () => {
  it("restricts the privileged client to audited platform-operation modules", () => {
    const repository = process.cwd();
    const imports = ["app", "lib", "src"]
      .flatMap((directory) => sourceFiles(path.join(repository, directory)))
      .filter((file) => fs.readFileSync(file, "utf8").includes("@/lib/prismaPrivileged"))
      .map((file) => path.relative(repository, file).replace(/\\/g, "/"))
      .sort();

    expect(imports).toEqual([
      "app/actions/auditActions.ts",
      "app/actions/telemetryActions.ts",
      "app/lib/security/ingressGateway.ts",
      "app/lib/security/quarantineTenantTargeting.ts",
      "lib/auditLogLoose.ts",
      "src/services/ironcast/stateFreezeCisoEscalation.ts",
      "src/services/ironlock/freezeEngine.ts",
      "src/services/ironscribe/auditSynthesizer.ts",
      "src/services/ironwatch/apiHeartbeat.ts",
      "src/services/ironwatch/securityMonitor.ts",
    ]);
    expect(fs.existsSync(path.join(repository, "lib/prismaAdmin.ts"))).toBe(false);
  });

  it("documents a narrow privileged role instead of granting every table", () => {
    const rollout = fs.readFileSync(
      path.join(process.cwd(), "prisma/scripts/tenant_rls_rollout.sql"),
      "utf8",
    );

    expect(rollout).toContain("CREATE ROLE ironframe_privileged");
    expect(rollout).toContain("ALTER ROLE ironframe_privileged");
    expect(rollout).toContain("rolbypassrls");
    expect(rollout).toContain('GRANT SELECT ON TABLE public."ThreatEvent" TO ironframe_privileged');
    expect(rollout).toContain('GRANT SELECT ON TABLE public."SimThreatEvent" TO ironframe_privileged');
    expect(rollout).toContain(
      'ALTER POLICY "tenant_isolation_BotAuditLog" ON public."BotAuditLog"',
    );
    expect(rollout).not.toMatch(/ALTER ROLE ironframe_privileged[^\n]*BYPASSRLS/);
    expect(rollout).not.toContain("ALL TABLES IN SCHEMA public TO ironframe_privileged");
  });
});
