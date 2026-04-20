"use server";

/**
 * Section 4.3 — Shadow-plane structural diagnostics ("Structural Deficiencies").
 * Irontech / repair agents may consume `OPERATIONAL_DEFICIENCY_REPORT` payloads from
 * `SimulationDiagnosticLog` to propose code fixes. Never write self-test rows to `ThreatEvent`
 * or production-scoped `AuditLog`.
 */

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { resolveDispositionOperatorId } from "@/app/utils/serverAuth";
import {
  extractIngestionDiagnostics,
  OPERATIONAL_DEFICIENCY_REPORT,
  OPERATIONAL_DEFICIENCY_RESOLVED,
  OPERATIONAL_SELF_TEST_PASS,
  type OperationalDeficiencyReportJustificationV1,
  parseReportPayloadFromJsonValue,
  residualScoreToSeverityLabel,
} from "@/app/lib/opsupport/operationalDeficiencyQueue";
import { getGitRevisionForDiagnostics } from "@/app/lib/diagnostics/gitRevision";

export type SubmitOperationalDeficiencyResult =
  | { success: true; reportId: string; auditLogId: string }
  | { success: false; error: string };

function clampTriage(n: number | undefined, fallback: number): number {
  if (n == null || !Number.isFinite(n)) return fallback;
  return Math.min(10, Math.max(1, Math.round(n)));
}

async function requireShadowPlane(): Promise<
  | { ok: true; tenantUuid: string }
  | { ok: false; error: string }
> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const sim = await readSimulationPlaneEnabled();
  if (!sim) {
    return {
      ok: false,
      error: "Structural diagnostics are only available in Shadow Mode (simulation plane).",
    };
  }
  return { ok: true, tenantUuid };
}

export async function submitOperationalDeficiencyReportAction(input: {
  threatId: string;
  comment: string;
  likelihood?: number;
  impact?: number;
  sourceComponentPath: string;
  geminiRepairPacket: string;
}): Promise<SubmitOperationalDeficiencyResult> {
  try {
    const plane = await requireShadowPlane();
    if (!plane.ok) return { success: false, error: plane.error };
    const { tenantUuid } = plane;

    const comment = input.comment.trim();
    if (comment.length < 4) {
      return { success: false, error: "Comment must be at least 4 characters." };
    }
    const sourceComponentPath = input.sourceComponentPath.trim();
    if (sourceComponentPath.length < 2) {
      return { success: false, error: "Source component path is required." };
    }
    const geminiRepairPacket = input.geminiRepairPacket.trim();
    if (geminiRepairPacket.length < 8) {
      return { success: false, error: "Gemini repair packet is required." };
    }

    const company = await prisma.company.findFirst({
      where: { tenantId: tenantUuid },
      select: { id: true },
    });
    const companyId = company?.id ?? null;
    if (companyId == null) {
      return { success: false, error: "No company for active tenant." };
    }

    const row = await prisma.simThreatEvent.findFirst({
      where: { id: input.threatId, tenantCompanyId: companyId },
      select: {
        id: true,
        title: true,
        status: true,
        score: true,
        ingestionDetails: true,
      },
    });

    if (!row) {
      return { success: false, error: "Sim threat not found for this tenant." };
    }

    const likelihood = clampTriage(input.likelihood, 8);
    const impact = clampTriage(input.impact, 9);
    const residualScore = likelihood * impact;
    const ingestionFull = row.ingestionDetails ?? null;
    const snapshot = {
      threatId: row.id,
      threatTitle: row.title,
      status: String(row.status),
      dbScore: row.score,
      severityLabel: residualScoreToSeverityLabel(residualScore),
      likelihood,
      impact,
      residualScore,
      ingestionDetailsFull: ingestionFull,
      ingestionDiagnostics: extractIngestionDiagnostics(ingestionFull),
      capturedAt: new Date().toISOString(),
    };

    const reportId = randomUUID();
    const gitRevision = getGitRevisionForDiagnostics();
    const payload: OperationalDeficiencyReportJustificationV1 = {
      schemaVersion: 1,
      reportId,
      priority: "HIGH",
      tenantUuid,
      comment,
      snapshot,
      sourceComponentPath,
      gitRevision,
      geminiRepairPacket,
    };

    const operatorId = await resolveDispositionOperatorId();

    const created = await prisma.simulationDiagnosticLog.create({
      data: {
        tenantUuid,
        simThreatId: row.id,
        action: OPERATIONAL_DEFICIENCY_REPORT,
        payload: payload as unknown as Prisma.InputJsonValue,
        operatorId,
      },
      select: { id: true },
    });

    revalidatePath("/opsupport");
    revalidatePath("/");
    revalidatePath("/", "layout");

    return { success: true, reportId, auditLogId: created.id };
  } catch (e) {
    console.error("[operationalDeficiencyActions] submit:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export type OperationalSelfTestPassResult = { success: true } | { success: false; error: string };

export async function submitOperationalSelfTestPassAction(input: {
  threatId: string;
  likelihood?: number;
  impact?: number;
  sourceComponentPath: string;
}): Promise<OperationalSelfTestPassResult> {
  try {
    const plane = await requireShadowPlane();
    if (!plane.ok) return { success: false, error: plane.error };
    const { tenantUuid } = plane;

    const sourceComponentPath = input.sourceComponentPath.trim();
    if (sourceComponentPath.length < 2) {
      return { success: false, error: "Source component path is required." };
    }

    const company = await prisma.company.findFirst({
      where: { tenantId: tenantUuid },
      select: { id: true },
    });
    const companyId = company?.id ?? null;
    if (companyId == null) {
      return { success: false, error: "No company for active tenant." };
    }

    const row = await prisma.simThreatEvent.findFirst({
      where: { id: input.threatId, tenantCompanyId: companyId },
      select: { id: true, title: true, status: true, score: true, ingestionDetails: true },
    });

    if (!row) {
      return { success: false, error: "Sim threat not found for this tenant." };
    }

    const likelihood = clampTriage(input.likelihood, 8);
    const impact = clampTriage(input.impact, 9);
    const residualScore = likelihood * impact;
    const gitRevision = getGitRevisionForDiagnostics();
    const payload = {
      schemaVersion: 1 as const,
      kind: "SELF_TEST_PASS" as const,
      tenantUuid,
      threatId: row.id,
      threatTitle: row.title,
      status: String(row.status),
      dbScore: row.score,
      likelihood,
      impact,
      residualScore,
      severityLabel: residualScoreToSeverityLabel(residualScore),
      sourceComponentPath,
      gitRevision,
      capturedAt: new Date().toISOString(),
    };

    const operatorId = await resolveDispositionOperatorId();
    await prisma.simulationDiagnosticLog.create({
      data: {
        tenantUuid,
        simThreatId: row.id,
        action: OPERATIONAL_SELF_TEST_PASS,
        payload: payload as unknown as Prisma.InputJsonValue,
        operatorId,
      },
      select: { id: true },
    });

    revalidatePath("/opsupport");
    revalidatePath("/");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (e) {
    console.error("[operationalDeficiencyActions] self-test pass:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export type ResolveOperationalDeficiencyResult = { success: true } | { success: false; error: string };

export async function resolveOperationalDeficiencyReportAction(
  reportId: string,
): Promise<ResolveOperationalDeficiencyResult> {
  try {
    const plane = await requireShadowPlane();
    if (!plane.ok) return { success: false, error: plane.error };
    const { tenantUuid } = plane;

    if (!reportId.trim()) {
      return { success: false, error: "Missing report id." };
    }
    const operatorId = await resolveDispositionOperatorId();
    const now = new Date();
    const resolved = {
      schemaVersion: 1 as const,
      resolvesReportId: reportId.trim(),
      resolvedAt: now.toISOString(),
      tenantUuid,
    };
    await prisma.simulationDiagnosticLog.create({
      data: {
        tenantUuid,
        simThreatId: null,
        action: OPERATIONAL_DEFICIENCY_RESOLVED,
        payload: resolved as unknown as Prisma.InputJsonValue,
        operatorId,
      },
    });

    const rid = reportId.trim();
    const reportRows = await prisma.simulationDiagnosticLog.findMany({
      where: {
        tenantUuid,
        action: OPERATIONAL_DEFICIENCY_REPORT,
        resolvedAt: null,
      },
      select: { id: true, payload: true },
    });
    const target = reportRows.find((row) => parseReportPayloadFromJsonValue(row.payload)?.reportId === rid);
    if (target) {
      await prisma.simulationDiagnosticLog.update({
        where: { id: target.id },
        data: { resolvedAt: now },
      });
    }

    revalidatePath("/opsupport");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (e) {
    console.error("[operationalDeficiencyActions] resolve:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
