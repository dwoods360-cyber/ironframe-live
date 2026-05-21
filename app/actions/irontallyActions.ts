"use server";

import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { readGovernanceMaturityState } from "@/app/lib/governanceMaturityState";
import { buildIrontallyFrameworkSnapshot } from "@/app/services/irontallyMapper";
import { buildIrontallyAuditMatrixCsv } from "@/app/utils/irontallyAuditMatrixCsv";
import {
  buildIrontallyComplianceReadinessPdfBytes,
  buildIrontallyExecutiveReadinessPdfBytes,
} from "@/app/utils/irontallyComplianceReadinessPdf";
import { compileFrameworkReadiness } from "@/src/services/compliance/irontallyEngine";
import prisma from "@/lib/prisma";

export async function getFrameworkReadinessAction() {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) return { ok: false as const, error: "No active tenant." };
  const readiness = await compileFrameworkReadiness(tenantId);
  return { ok: true as const, readiness };
}

export async function getIrontallyFrameworkSnapshotAction() {
  const state = await readGovernanceMaturityState();
  return buildIrontallyFrameworkSnapshot(state.current.score, state.current.calculatedAt);
}

export async function downloadComplianceReadinessPdfAction(): Promise<
  | { ok: true; base64Pdf: string; filename: string }
  | { ok: false; error: string }
> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) return { ok: false, error: "No active tenant." };

  const snapshot = await getIrontallyFrameworkSnapshotAction();
  const bytes = buildIrontallyComplianceReadinessPdfBytes(snapshot);
  const base64Pdf = Buffer.from(bytes).toString("base64");
  const date = snapshot.asOf.slice(0, 10);
  return {
    ok: true,
    base64Pdf,
    filename: `irontally-compliance-readiness-${date}.pdf`,
  };
}

export async function downloadExecutiveReadinessPdfAction(): Promise<
  | { ok: true; base64Pdf: string; filename: string }
  | { ok: false; error: string }
> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) return { ok: false, error: "No active tenant." };

  const [snapshot, readiness, tenant] = await Promise.all([
    getIrontallyFrameworkSnapshotAction(),
    compileFrameworkReadiness(tenantId),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ]);

  const bytes = buildIrontallyExecutiveReadinessPdfBytes({
    snapshot,
    tenantId,
    tenantName: tenant?.name ?? "Active tenant",
    readiness,
  });
  const date = new Date().toISOString().slice(0, 10);
  const slug = (tenant?.name ?? "tenant").replace(/\s+/g, "-").toLowerCase();
  return {
    ok: true,
    base64Pdf: Buffer.from(bytes).toString("base64"),
    filename: `irontally-executive-readiness-${slug}-${date}.pdf`,
  };
}

export async function downloadAuditMatrixCsvAction(): Promise<
  | { ok: true; csv: string; filename: string }
  | { ok: false; error: string }
> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) return { ok: false, error: "No active tenant." };

  const [readiness, tenant] = await Promise.all([
    compileFrameworkReadiness(tenantId),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ]);

  const asOf = new Date().toISOString();
  const csv = buildIrontallyAuditMatrixCsv({
    tenantId,
    tenantName: tenant?.name ?? "Active tenant",
    asOf,
    readiness,
  });
  const date = asOf.slice(0, 10);
  const slug = (tenant?.name ?? "tenant").replace(/\s+/g, "-").toLowerCase();
  return {
    ok: true,
    csv,
    filename: `irontally-audit-matrix-${slug}-${date}.csv`,
  };
}
