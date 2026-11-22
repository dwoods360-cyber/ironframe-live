import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const TENANT = "11111111-1111-4111-8111-111111111111";
const prisma = new PrismaClient();

function asRec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function gateResult(brief: Record<string, unknown> | null, key: string): string | null {
  const gates = asRec(brief?.gates);
  const g = asRec(gates?.[key]);
  return typeof g?.result === "string" ? g.result : null;
}

function hasNamedBuyerMeta(meta: Record<string, unknown>): boolean {
  const nb = asRec(meta.namedBuyer);
  const name = typeof nb?.fullName === "string" ? nb.fullName.trim() : "";
  if (name.length >= 2 && !/scorecard|free|unknown|n\/a/i.test(name)) return true;
  const bc = asRec(meta.buyingCommittee);
  const members = Array.isArray(bc?.members) ? bc.members : [];
  return members.some((m) => {
    const r = asRec(m);
    const n = typeof r?.fullName === "string" ? r.fullName.trim() : "";
    return n.length >= 2 && !/scorecard|free|unknown|n\/a/i.test(n);
  });
}

function holdClass(meta: Record<string, unknown>): string {
  const hold = asRec(meta.operatorHold);
  if (!hold) return "active_none";
  const c = typeof hold.classification === "string" ? hold.classification.trim().toLowerCase() : "";
  if (
    c === "pending_batch" ||
    c === "enrich_later" ||
    c === "channel_competitor" ||
    c === "hold" ||
    c === "other"
  ) {
    return c;
  }
  return "other";
}

async function main() {
  // Diagnostic outside RLS first
  const dealCount = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(*)::bigint AS n FROM ironboard_crm_deals WHERE stage = 'SUSPECT'`,
  );
  const contactCount = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(*)::bigint AS n FROM ironboard_crm_contacts`,
  );
  const tenantDeal = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(*)::bigint AS n FROM ironboard_crm_deals WHERE stage = 'SUSPECT' AND tenant_id = '${TENANT}'::uuid`,
  );
  console.log(
    JSON.stringify({
      diagnostic: {
        allSuspectDeals: Number(dealCount[0]?.n ?? 0),
        allContacts: Number(contactCount[0]?.n ?? 0),
        tenantSuspectDeals: Number(tenantDeal[0]?.n ?? 0),
        dbHostHint: (process.env.DATABASE_URL || "").replace(/:[^:@/]+@/, ":***@").slice(0, 80),
      },
    }),
  );

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT public.ironguard_set_session_tenant('${TENANT}'::uuid)`,
    );

    const contacts = await tx.ironboardCrmContact.findMany({
      where: {
        tenantId: TENANT,
        primaryDeals: { some: { stage: "SUSPECT" } },
      },
      select: {
        id: true,
        email: true,
        metadata: true,
      },
    });

    const holdBuckets: Record<string, number> = {
      pending_batch: 0,
      enrich_later: 0,
      channel_competitor: 0,
      hold: 0,
      other: 0,
      active_none: 0,
    };

    let namedBuyers = 0;
    let namedPromoteReadyInbox = 0;
    let fullyGated = 0;
    let fullyGatedPendingBatch = 0;
    let promoteOutreach = 0;
    let emailPass = 0;
    let buyerPass = 0;
    let fitPass = 0;
    let briefMissing = 0;
    let ironleadsLocalEmail = 0;
    let pbNamed = 0;
    let pbEmailPass = 0;
    let pbBuyerPass = 0;
    let pbFitPass = 0;
    let pbFullyGated = 0;
    let pbPromote = 0;
    let pbBriefMissing = 0;

    for (const c of contacts) {
      const meta = asRec(c.metadata) ?? {};
      const hc = holdClass(meta);
      holdBuckets[hc] = (holdBuckets[hc] ?? 0) + 1;

      const named = hasNamedBuyerMeta(meta);
      if (named) namedBuyers += 1;

      const brief = asRec(meta.accountResearchBrief);
      if (!brief) briefMissing += 1;

      const fit = gateResult(brief, "fit");
      const buyer = gateResult(brief, "buyer");
      const email = gateResult(brief, "email");
      if (fit === "PASS") fitPass += 1;
      if (buyer === "PASS") buyerPass += 1;
      if (email === "PASS") emailPass += 1;

      const outreach = asRec(brief?.outreach);
      const outreachStatus = typeof outreach?.status === "string" ? outreach.status : null;
      if (outreachStatus === "promote" || outreachStatus === "promote_ready") promoteOutreach += 1;

      const gated = fit === "PASS" && buyer === "PASS" && email === "PASS";
      if (gated) {
        fullyGated += 1;
        if (hc === "pending_batch") fullyGatedPendingBatch += 1;
      }

      if (
        named &&
        (email === "PASS" || outreachStatus === "promote" || outreachStatus === "promote_ready")
      ) {
        namedPromoteReadyInbox += 1;
      }

      if (typeof c.email === "string" && /@ironleads\.local$/i.test(c.email)) {
        ironleadsLocalEmail += 1;
      }

      if (hc === "pending_batch") {
        if (!brief) pbBriefMissing += 1;
        if (named) pbNamed += 1;
        if (fit === "PASS") pbFitPass += 1;
        if (buyer === "PASS") pbBuyerPass += 1;
        if (email === "PASS") pbEmailPass += 1;
        if (gated) pbFullyGated += 1;
        if (outreachStatus === "promote" || outreachStatus === "promote_ready") pbPromote += 1;
      }
    }

    return {
      tenant: TENANT,
      totalSuspectContacts: contacts.length,
      namedBuyers,
      namedPromoteReadyInbox,
      fullyGatedFitBuyerEmail: fullyGated,
      fullyGatedPendingBatch,
      promoteOutreachStatus: promoteOutreach,
      gatePassTotals: { fitPass, buyerPass, emailPass },
      briefMissing,
      ironleadsLocalPlaceholderEmail: ironleadsLocalEmail,
      byHoldClassification: holdBuckets,
      pendingBatchDetail: {
        count: holdBuckets.pending_batch,
        namedBuyers: pbNamed,
        fitPass: pbFitPass,
        buyerPass: pbBuyerPass,
        emailPass: pbEmailPass,
        fullyGated: pbFullyGated,
        promoteOutreach: pbPromote,
        briefMissing: pbBriefMissing,
      },
    };
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
