import { NextRequest, NextResponse } from "next/server";

import { normalizeProvisionedTenantSlug } from "@/app/lib/tenantSlugRegistry";
import { elevateInboundLeadPriority } from "@/app/lib/server/inboundLeadOpsCore";
import { parseDollarAleToBigIntCents } from "@/app/lib/server/salesIntakeParse";
import { recordProspectLead } from "@/app/lib/server/prospectLedger";

export const dynamic = "force-dynamic";

type PublicLeadBody = {
  orgName?: unknown;
  email?: unknown;
  slug?: unknown;
  reportedAle?: unknown;
  reportedAleDollars?: unknown;
};

function sanitizeText(raw: unknown, maxLen: number): string {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLen);
}

function deriveSlug(orgName: string, slugRaw: string): string | null {
  const explicit = normalizeProvisionedTenantSlug(slugRaw);
  if (explicit) return explicit;
  const fromOrg = normalizeProvisionedTenantSlug(
    orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48),
  );
  return fromOrg;
}

export async function POST(req: NextRequest) {
  let body: PublicLeadBody;
  try {
    body = (await req.json()) as PublicLeadBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const orgName = sanitizeText(body.orgName, 200);
  const email = sanitizeText(body.email, 320).toLowerCase();
  const slugInput = sanitizeText(body.slug, 63);

  if (!orgName || orgName.length < 2) {
    return NextResponse.json({ ok: false, error: "Organization name is required." }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Valid work email is required." }, { status: 400 });
  }

  const slug = deriveSlug(orgName, slugInput);
  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "Could not derive a valid workspace slug from organization name." },
      { status: 400 },
    );
  }

  const aleRaw = body.reportedAle ?? body.reportedAleDollars;
  const aleParsed =
    aleRaw == null || String(aleRaw).trim() === ""
      ? { ok: true as const, cents: 0n }
      : parseDollarAleToBigIntCents(aleRaw);

  if (!aleParsed.ok) {
    return NextResponse.json({ ok: false, error: aleParsed.error }, { status: 400 });
  }

  try {
    const prospect = await recordProspectLead({
      orgName,
      slug,
      email,
      reportedAle: aleParsed.cents,
    });

    let opsNotified = false;
    let queuedDraftId: string | null = null;
    try {
      const elevated = await elevateInboundLeadPriority({
        orgName: prospect.orgName,
        slug: prospect.slug,
        email: prospect.email,
        reportedAleCents: aleParsed.cents,
      });
      opsNotified = elevated.notified;
      queuedDraftId = elevated.queuedDraftId;
    } catch (elevateErr) {
      // Lead is already persisted — never fail the public response on ops elevation.
      console.error("[public-lead] P1 elevation failed", elevateErr);
    }

    return NextResponse.json({
      ok: true,
      prospectSlug: prospect.slug,
      reportedAleCents: aleParsed.cents.toString(),
      priority: 1,
      opsNotified,
      approvalsDraftQueued: Boolean(queuedDraftId),
      approvalsDraftId: queuedDraftId,
    });
  } catch (e) {
    console.error("[public-lead]", e);
    return NextResponse.json({ ok: false, error: "Failed to record lead." }, { status: 500 });
  }
}
