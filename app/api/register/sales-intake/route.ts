import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { authorizeSalesIntakeRequest } from "@/app/lib/auth/salesIntakeAuth";
import {
  inviteCorporateTenantUserCore,
  provisionCorporateTenantCore,
} from "@/app/lib/server/corporateTenantProvisionCore";
import { recordProspectLead } from "@/app/lib/server/prospectLedger";
import {
  isSalesCanonicalProfile,
  parseDollarAleToBigIntCents,
  parseExplicitCentAle,
  verifyCanonicalEnterpriseBaseline,
  type SalesCanonicalProfile,
} from "@/app/lib/server/salesIntakeParse";

export const dynamic = "force-dynamic";

const SALES_INTAKE_OPERATOR_ID = "SALES_ASSISTED_INTAKE";

type SalesIntakeBody = {
  name?: unknown;
  slug?: unknown;
  email?: unknown;
  /** medshield | vaultbank | gridcore — ALE must match TAS canonical cents. */
  canonicalProfile?: unknown;
  /** Dollar-denominated ALE (commas/currency stripped, ×100 → cents). */
  aleBaselineDollars?: unknown;
  /** Whole-cent integer string (used as-is when provided). */
  aleBaselineCents?: unknown;
  industry?: unknown;
};

function resolveAleCents(body: SalesIntakeBody): { ok: true; cents: bigint } | { ok: false; error: string } {
  const centsRaw = body.aleBaselineCents;
  if (centsRaw != null && String(centsRaw).trim() !== "") {
    return parseExplicitCentAle(centsRaw);
  }
  const dollarsRaw = body.aleBaselineDollars ?? body.aleBaselineCents;
  return parseDollarAleToBigIntCents(dollarsRaw);
}

export async function POST(req: NextRequest) {
  if (!authorizeSalesIntakeRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: SalesIntakeBody;
  try {
    body = (await req.json()) as SalesIntakeBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const slugRaw = String(body.slug ?? "").trim();
  const email = String(body.email ?? "").trim();
  const profileRaw = String(body.canonicalProfile ?? "").trim().toLowerCase();

  if (!isSalesCanonicalProfile(profileRaw)) {
    return NextResponse.json(
      {
        ok: false,
        error: `canonicalProfile must be one of: medshield, vaultbank, gridcore.`,
      },
      { status: 400 },
    );
  }

  const canonicalProfile: SalesCanonicalProfile = profileRaw;
  const aleParsed = resolveAleCents(body);
  if (!aleParsed.ok) {
    return NextResponse.json({ ok: false, error: aleParsed.error }, { status: 400 });
  }

  const baselineCheck = verifyCanonicalEnterpriseBaseline(canonicalProfile, aleParsed.cents);
  if (!baselineCheck.ok) {
    return NextResponse.json({ ok: false, error: baselineCheck.error }, { status: 422 });
  }

  const industry =
    String(body.industry ?? "").trim() ||
    (canonicalProfile === "medshield"
      ? "Healthcare"
      : canonicalProfile === "vaultbank"
        ? "Finance"
        : "Infrastructure");

  const provision = await provisionCorporateTenantCore({
    name,
    slugRaw,
    industry,
    aleBaselineCentsRaw: aleParsed.cents.toString(),
    operatorId: SALES_INTAKE_OPERATOR_ID,
    auditAction: "SALES_ASSISTED_TENANT_PROVISIONED",
  });

  if (!provision.ok) {
    const status = provision.error.includes("already provisioned") ? 409 : 400;
    return NextResponse.json({ ok: false, error: provision.error }, { status });
  }

  try {
    await recordProspectLead({
      orgName: name,
      slug: provision.slug,
      email,
      reportedAle: aleParsed.cents,
    });
  } catch (ledgerError) {
    console.error("[sales-intake] Prospect ledger upsert failed:", ledgerError);
    return NextResponse.json(
      {
        ok: false,
        error: "Tenant provisioned but executive lead ledger write failed.",
        partial: { tenantSlug: provision.slug, workspaceUrl: provision.workspaceUrl },
      },
      { status: 500 },
    );
  }

  const invite = await inviteCorporateTenantUserCore({
    email,
    tenantSlugRaw: provision.slug,
    operatorId: SALES_INTAKE_OPERATOR_ID,
    role: UserRole.GRC_MANAGER,
    auditAction: "SALES_ASSISTED_USER_INVITED",
  });

  if (!invite.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: invite.error,
        partial: { tenantSlug: provision.slug, workspaceUrl: provision.workspaceUrl },
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    success: true,
    tenantSlug: provision.slug,
    workspaceUrl: provision.workspaceUrl,
    redirectUrl: provision.redirectUrl,
    email: invite.email,
    canonicalProfile,
    aleBaselineCents: aleParsed.cents.toString(),
    prospectSlug: provision.slug,
  });
}
