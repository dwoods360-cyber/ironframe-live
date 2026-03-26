"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { ThreatState } from "@prisma/client";
import { logIronwatch } from "@/app/utils/ironwatchLog";

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

    let company = await prisma.company.findFirst();
    let bootstrapCompany = false;

    if (!company) {
      await prisma.tenant.upsert({
        where: { id: tenantId },
        create: {
          id: tenantId,
          name: "ATTBOT Bootstrap Tenant",
          slug: `attbot-${tenantId}`,
          industry: "Secure Enclave",
        },
        update: {},
      });
      company = await prisma.company.create({
        data: {
          name: "Internal Test Co",
          sector: "Technology",
          tenantId,
          isTestRecord: true,
        },
      });
      bootstrapCompany = true;
      await logIronwatch({
        event_type: "ATTBOT_COMPANY_BOOTSTRAP",
        actor_id: tenantId,
        detail: `Created fallback Company id=${company.id.toString()} isTestRecord=true`,
        severity: "WARN",
      });
    }

    attbotDevLog("using company", {
      tenantCompanyId: company.id.toString(),
      bootstrapCompany,
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

    await prisma.threatEvent.create({
      data: {
        tenantCompanyId: company.id,
        status: ThreatState.PIPELINE,
        sourceAgent: "ATTBOT_SIMULATION",
        score: 10,
        title: "Automated simulated SQL Injection attack via Attbot.",
        targetEntity: mockPayload.target,
        financialRisk_cents: 0n,
        ttlSeconds: 259200,
        ingestionDetails: JSON.stringify(mockPayload),
        aiReport:
          "Ironquery Initial Scan: Simulated hostile payload detected. Matches known SQLi patterns. Recommend isolation.",
      },
    });

    await logIronwatch({
      event_type: "ATTBOT_SIMULATION_OK",
      actor_id: tenantId,
      detail: JSON.stringify({
        companyId: company.id.toString(),
        bootstrapCompany,
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
