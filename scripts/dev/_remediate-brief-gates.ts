/**
 * Rebuild Account Research Brief Email/Buyer gates for non-pending SUSPECT rows
 * missing the Email gate or missing a brief while a real inbox / named buyer exists.
 *
 * Mirrors report-page select+persist without importing server-only modules.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

import {
  buildAccountResearchBrief,
  mergeNamedBuyerIntoBriefMembers,
  resolveAccountResearchBrief,
  selectAccountResearchBriefForReport,
} from "../../app/lib/server/ironleadsAccountResearchBrief";
import { resolveSuspectLocationFields } from "../../app/lib/server/ironleadsSuspectLocation";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const TENANT = "11111111-1111-4111-8111-111111111111";
const prisma = new PrismaClient();

function asRec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

async function rebuildOne(contactId: string) {
  const contact = await prisma.ironboardCrmContact.findUnique({
    where: { id: contactId },
    include: {
      primaryDeals: {
        where: { stage: "SUSPECT" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { accountDomain: true, stage: true },
      },
    },
  });
  if (!contact) return { ok: false as const, error: "not_found" };

  const deal = contact.primaryDeals[0] ?? null;
  const location = resolveSuspectLocationFields({
    metadata: contact.metadata,
    accountDomain: deal?.accountDomain ?? null,
  });
  const hasRealEmail =
    Boolean(contact.email) && !/@ironleads\.local$/i.test(contact.email);
  const hasPhone = Boolean(
    contact.phone?.trim() || location.websiteContact?.phone?.trim(),
  );
  const persistedBrief = resolveAccountResearchBrief(contact.metadata);
  const briefMembers = mergeNamedBuyerIntoBriefMembers({
    members: location.buyingCommittee?.members ?? [],
    namedBuyer: location.namedBuyer
      ? {
          fullName: location.namedBuyer.fullName,
          title: location.namedBuyer.title,
          role: location.namedBuyer.role,
          email: location.namedBuyer.email,
          emailStatus: location.namedBuyer.emailStatus,
          linkedinUrl: location.namedBuyer.linkedinUrl,
          sourceUrls: location.namedBuyer.sourceUrls,
          note: location.namedBuyer.note,
        }
      : null,
    contactEmail: hasRealEmail ? contact.email : null,
    contactTitle: contact.title,
  });
  const reportCorpus = [
    contact.company,
    contact.industrySector,
    location.websiteUrl,
    contact.detectedTrigger,
    contact.title,
    location.namedBuyer?.fullName,
    location.namedBuyer?.title,
    location.namedBuyer?.role,
    /mssp|vciso|grc|compliance|cyber/i.test(
      `${contact.industrySector ?? ""} ${location.namedBuyer?.title ?? ""} ${contact.title ?? ""}`,
    )
      ? "MSSP vCISO compliance advisory cybersecurity"
      : null,
    ...briefMembers.flatMap((m) =>
      [m.fullName, m.title, m.note, ...m.emails.map((e) => e.email)].filter(Boolean),
    ),
  ]
    .filter(Boolean)
    .join("\n");

  const hold = asRec(asRec(contact.metadata)?.operatorHold);
  const pathBHold =
    hold?.classification === "channel_competitor" || hold?.classification === "hold";
  const rebuiltBrief = buildAccountResearchBrief({
    company: contact.company,
    websiteUrl: location.websiteUrl,
    detectedTrigger: contact.detectedTrigger,
    industrySector: contact.industrySector,
    dealStage: deal?.stage ?? "SUSPECT",
    corpus: reportCorpus,
    sourceUrls: [
      ...(location.namedBuyer?.sourceUrls ?? []),
      ...(location.namedBuyer?.linkedinUrl ? [location.namedBuyer.linkedinUrl] : []),
      ...(location.buyingCommittee?.members.flatMap((m) => m.sourceUrls) ?? []),
      ...(location.buyingCommittee?.socialProfiles.map((s) => s.url) ?? []),
    ],
    members: briefMembers,
    socialProfiles: location.buyingCommittee?.socialProfiles ?? [],
    hasRealEmail,
    contactEmail: hasRealEmail ? contact.email : null,
    pathBHold,
    hasPhone,
    generatedAt: new Date().toISOString(),
  });

  const selection = selectAccountResearchBriefForReport(persistedBrief, rebuiltBrief);
  // Force schema repair / missing brief onto CRM even if selector is conservative.
  const force =
    !persistedBrief || Boolean(persistedBrief && !persistedBrief.gates?.email);
  const brief = force ? selection.brief : selection.brief;
  const shouldWrite = force || selection.shouldPersist;

  if (shouldWrite) {
    const meta = asRec(contact.metadata) || {};
    await prisma.ironboardCrmContact.update({
      where: { id: contact.id },
      data: {
        metadata: {
          ...meta,
          accountResearchBrief: brief,
        } as Prisma.InputJsonValue,
      },
    });
  }

  return {
    ok: true as const,
    company: contact.company,
    written: shouldWrite,
    reasons: force ? [...selection.reasons, "forced_schema_or_missing"] : selection.reasons,
    buyer: brief.gates.buyer.result,
    email: brief.gates.email?.result ?? null,
  };
}

async function main() {
  const deals = await prisma.ironboardCrmDeal.findMany({
    where: { tenantId: TENANT, stage: "SUSPECT" },
    select: {
      primaryContact: {
        select: { id: true, company: true, email: true, metadata: true },
      },
    },
    take: 500,
  });

  const targets: Array<{ id: string; company: string; reason: string }> = [];
  for (const d of deals) {
    const c = d.primaryContact;
    if (!c) continue;
    const meta = asRec(c.metadata) || {};
    const brief = asRec(meta.accountResearchBrief);
    const gates = asRec(brief?.gates);
    const realEmail = Boolean(c.email) && !/@ironleads\.local$/i.test(c.email);
    const named = Boolean(asRec(meta.namedBuyer)?.fullName);
    const emailMissing = Boolean(brief) && !gates?.email;
    const noBrief = !brief && (realEmail || named);
    const hold = (asRec(meta.operatorHold)?.classification as string | undefined) ?? null;
    if (hold === "pending_batch") continue;
    const outreach = asRec(brief?.outreach)?.status;
    const promoteOnHold =
      (hold === "channel_competitor" || hold === "hold") && outreach === "promote";
    if (emailMissing || noBrief || promoteOnHold) {
      targets.push({
        id: c.id,
        company: c.company,
        reason: promoteOnHold
          ? "promote_on_pathb_hold"
          : emailMissing
            ? "email_gate_missing"
            : "no_brief",
      });
    }
  }

  console.log(JSON.stringify({ targetCount: targets.length, targets }, null, 2));

  const remediated = [];
  for (const t of targets) {
    const result = await rebuildOne(t.id);
    remediated.push({ ...t, ...result });
  }
  console.log(JSON.stringify({ remediated }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
