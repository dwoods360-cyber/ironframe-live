import { NextResponse } from "next/server";

import { recordProspectLead } from "@/app/lib/server/prospectLedger";
import {
  baselineAleCents,
  logPendingSalesDraftApproval,
  resolveProspectPoolTenantId,
  SALES_LEAD_OFFLINE_MESSAGE,
  SALES_LEAD_QUEUED_MESSAGE,
  sanitizeSalesIntake,
  synthesizeSalesAgentPitch,
  upsertProspectCrmContact,
} from "@/app/lib/server/salesAgentConsoleCore";
import { normalizeProvisionedTenantSlug } from "@/app/lib/tenantSlugRegistry";
import { validateIngressContext } from "@/app/middleware/irongateShield";
import { GRC_SALES_PLAYBOOK } from "@/Ironboard/src/agents/sales/playbook";

export const dynamic = "force-dynamic";

function deriveLeadSlug(company: string, email: string): string | null {
  const fromCompany = normalizeProvisionedTenantSlug(
    company
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48),
  );
  if (fromCompany) return fromCompany;
  const domain = email.split("@")[1]?.split(".")[0] ?? "";
  return normalizeProvisionedTenantSlug(domain);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const intake = sanitizeSalesIntake(body);
    if ("error" in intake) {
      return NextResponse.json({ error: intake.error }, { status: 400 });
    }

    const prospectTenantId = resolveProspectPoolTenantId();
    validateIngressContext(prospectTenantId);

    const contactRecord = await upsertProspectCrmContact(intake);

    const slug = deriveLeadSlug(intake.company, intake.email);
    if (slug) {
      await recordProspectLead({
        orgName: intake.company,
        slug,
        email: intake.email,
        reportedAle: baselineAleCents(intake.baselineTarget),
      });
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error(
        "Operational Error: Missing Google/Gemini API key strings inside environment execution frame.",
      );
      return NextResponse.json(
        {
          status: "QUEUED",
          message: SALES_LEAD_OFFLINE_MESSAGE,
        },
        { status: 200 },
      );
    }

    const playbookTier = GRC_SALES_PLAYBOOK[intake.baselineTarget];
    const technicalPitch = await synthesizeSalesAgentPitch(intake, contactRecord, playbookTier);

    const interactionId = await logPendingSalesDraftApproval({
      tenantId: contactRecord.tenantId,
      contactId: contactRecord.id,
      company: intake.company,
      baselineTarget: intake.baselineTarget,
      notes: intake.notes,
      proposedPitch: technicalPitch,
    });

    return NextResponse.json({
      status: "QUEUED",
      interactionId,
      message: SALES_LEAD_QUEUED_MESSAGE,
    });
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : "Unknown error context.";
    console.error("Critical exception inside Sales Agent routing node boundary:", err);
    return NextResponse.json(
      { error: "Internal Strategy Route Failure", details },
      { status: 500 },
    );
  }
}
