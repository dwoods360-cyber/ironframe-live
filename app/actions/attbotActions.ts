"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { ThreatState } from "@prisma/client";
import { logIronwatch } from "@/app/utils/ironwatchLog";

/** $2,500.00 in cents for realistic Attbot financial ingress. */
const ATTBOT_DEFAULT_FINANCIAL_RISK_CENTS = 250_000n;

function attbotDevLog(message: string, extra?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  if (extra) {
    console.info(`[ATTBOT] ${message}`, extra);
  } else {
    console.info(`[ATTBOT] ${message}`);
  }
}

/** Log-only: masks user:password@ in postgres URLs (Supabase-safe). */
function maskDatabaseUrlForLog(raw: string | undefined): string {
  if (raw == null || raw.trim() === "") return "(not set)";
  return raw.replace(/:\/\/([^:/?#]+):([^@/?#]+)@/, "://$1:****@");
}

export async function triggerAttbotSimulation() {
  const store = await cookies();
  const cookieRaw = store.get("ironframe-tenant")?.value ?? null;
  const tenantId = await getActiveTenantUuidFromCookies();

  if (!tenantId) {
    attbotDevLog("resolved tenantId is falsy", {
      cookieRaw,
      cookieEmpty: cookieRaw == null || cookieRaw.trim() === "",
    });
    await logIronwatch({
      event_type: "ATTBOT_NO_TENANT",
      actor_id: "unknown",
      detail: "No active tenant cookie / UUID.",
      severity: "ERROR",
    });
    throw new Error("No active tenant.");
  }

  attbotDevLog("tenant resolution", {
    cookieRaw: cookieRaw ?? "(missing)",
    cookieEmpty: cookieRaw == null || cookieRaw.trim() === "",
    resolvedTenantId: tenantId,
  });

  try {
    attbotDevLog("DATABASE_URL (masked)", {
      url: maskDatabaseUrlForLog(process.env.DATABASE_URL),
    });

    // 1. Try strict tenant lookup
    let targetCompany = await prismaAdmin.company.findFirst({
      where: { tenantId },
      select: { id: true, isTestRecord: true, tenantId: true },
    });

    // 2. GRC Fallback: If tenantId is stale/wrong, find ANY authorized sandbox
    if (!targetCompany || !targetCompany.isTestRecord) {
      targetCompany = await prismaAdmin.company.findFirst({
        where: { isTestRecord: true },
        select: { id: true, isTestRecord: true, tenantId: true },
      });
    }

    // 3. Absolute safety: If no sandbox found, grab first record available
    if (!targetCompany) {
      targetCompany = await prismaAdmin.company.findFirst({
        select: { id: true, isTestRecord: true, tenantId: true },
      });
    }

    // 4. Final Error: Only if the database is literally empty
    if (!targetCompany) {
      throw new Error("Database Empty: Please run npx prisma db seed");
    }

    attbotDevLog("using company", {
      tenantCompanyId: targetCompany.id.toString(),
      tenantId: targetCompany.tenantId,
    });

    const mockPayload = {
      vector: "SQL_INJECTION",
      ip: "192.168.1.105",
      severity: "CRITICAL",
      target: "/api/v1/auth/login",
      timestamp: new Date().toISOString(),
      raw_query:
        "SELECT * FROM users WHERE email = 'admin@ironframe.ai' OR 1=1--",
    };
    const payloadWithTenant = {
      ...mockPayload,
      tenantId: targetCompany.tenantId,
    };

    const createdThreat = await prismaAdmin.threatEvent.create({
      data: {
        tenantCompanyId: targetCompany.id,
        status: ThreatState.PIPELINE,
        sourceAgent: "ATTBOT_SIMULATION",
        score: 10,
        title: "Automated simulated SQL Injection attack via Attbot.",
        targetEntity: mockPayload.target,
        financialRisk_cents: ATTBOT_DEFAULT_FINANCIAL_RISK_CENTS,
        ttlSeconds: 259200,
        ingestionDetails: JSON.stringify(payloadWithTenant),
        aiReport:
          "Ironquery Initial Scan: Simulated hostile payload detected. Matches known SQLi patterns. Recommend isolation.",
      },
      select: {
        id: true,
        tenantCompanyId: true,
      },
    });
    revalidatePath("/");
    attbotDevLog("created threat event", {
      threatId: createdThreat.id,
      tenantCompanyId: createdThreat.tenantCompanyId?.toString() ?? null,
      tenantId: targetCompany.tenantId,
    });
    try {
      const simulatedDelegate = (prismaAdmin as unknown as {
        simulatedThreatEvent?: { create: (arg: unknown) => Promise<unknown> };
      }).simulatedThreatEvent;
      if (simulatedDelegate?.create) {
        await simulatedDelegate.create({
          data: {
            tenantCompanyId: targetCompany.id,
            status: ThreatState.PIPELINE,
            sourceAgent: "ATTBOT_SIMULATION",
            score: 10,
            title: "Automated simulated SQL Injection attack via Attbot.",
            targetEntity: mockPayload.target,
            financialRisk_cents: ATTBOT_DEFAULT_FINANCIAL_RISK_CENTS,
            ttlSeconds: 259200,
            drillId: `attbot-${Date.now()}`,
            ingestionDetails: JSON.stringify(payloadWithTenant),
            aiReport:
              "Ironquery Initial Scan: Simulated hostile payload detected. Matches known SQLi patterns. Recommend isolation.",
          },
        });
      }
    } catch (error) {
      console.error("ATTBOT simulated shadow write failed (non-blocking):", error);
    }

    await logIronwatch({
      event_type: "ATTBOT_SIMULATION_OK",
      actor_id: tenantId,
      detail: JSON.stringify({
        companyId: targetCompany.id.toString(),
        tenantId: targetCompany.tenantId,
        threatId: createdThreat.id,
      }),
      severity: "INFO",
    });

    revalidatePath("/admin/clearance");
    revalidatePath("/admin/chat");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logIronwatch({
      event_type: "ATTBOT_SIMULATION_FAILED",
      actor_id: tenantId,
      detail: JSON.stringify({
        error: message,
        databaseUrlMasked: maskDatabaseUrlForLog(process.env.DATABASE_URL),
      }),
      severity: "ERROR",
    });
    throw err;
  }
}
