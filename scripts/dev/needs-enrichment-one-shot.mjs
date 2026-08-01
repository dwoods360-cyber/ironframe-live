/**
 * One-shot: apply Needs enrichment to a PENDING SALES draft by interaction id
 * or company name. Uses DATABASE_URL from env.
 *
 *   node --env-file=.env.local scripts/dev/needs-enrichment-one-shot.mjs "Pivot Point"
 */
import { PrismaClient } from "@prisma/client";

const TAG = "[PENDING SALES DRAFT APPROVAL]";
const NE_TAG = "[NEEDS ENRICHMENT]";
const query = (process.argv[2] || "").trim();
if (!query) {
  console.error('Usage: … one-shot.mjs "<company substring or interactionId>"');
  process.exit(2);
}

const p = new PrismaClient();

function placeholderEmail(contactId) {
  const short = contactId.replace(/-/g, "").slice(0, 12).toLowerCase();
  return `needs-enrichment+${short}@ironleads.local`;
}

try {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

  const row = await p.ironboardCrmInteraction.findFirst({
    where: isUuid
      ? { id: query }
      : {
          summary: { contains: TAG },
          NOT: {
            OR: [
              { summary: { contains: "[PURGED DRAFT]" } },
              { summary: { contains: NE_TAG } },
            ],
          },
          contact: { company: { contains: query, mode: "insensitive" } },
        },
    orderBy: { createdAt: "desc" },
    include: { contact: true, deal: true },
  });

  if (!row?.contact) {
    console.error("No matching pending draft found");
    process.exit(1);
  }
  if (!row.summary.includes(TAG) || row.summary.includes("[PURGED DRAFT]") || row.summary.includes(NE_TAG)) {
    console.error("Not a pending SALES draft", row.id);
    process.exit(1);
  }

  const stamp = new Date().toISOString();
  const priorEmail = row.contact.email;
  const priorPhone = row.contact.phone;
  const placeholder = placeholderEmail(row.contact.id);
  const archived = [
    `${NE_TAG} Operator returned this draft for contact enrichment (not send-ready).`,
    "Deal demoted to SUSPECT; destinations cleared for re-enrichment.",
    "--- Discarded Copy Text ---",
    row.summary,
  ]
    .join("\n")
    .slice(0, 12_000);

  const dealNote = `[${stamp}] Needs enrichment (Approvals N/E): cleared To ${priorEmail} / phone ${priorPhone || "(none)"}; demoted PROSPECT → SUSPECT. Do not DISPATCH until named buyer + verified channel.`;

  const priorMeta =
    row.contact.metadata && typeof row.contact.metadata === "object"
      ? row.contact.metadata
      : {};

  await p.$transaction(async (tx) => {
    await tx.ironboardCrmInteraction.update({
      where: { id: row.id },
      data: { summary: archived, occurredAt: new Date() },
    });
    await tx.ironboardCrmContact.update({
      where: { id: row.contact.id },
      data: {
        email: placeholder,
        phone: null,
        metadata: {
          ...priorMeta,
          needsEnrichment: {
            at: stamp,
            fromApprovalsInteractionId: row.id,
            priorEmail,
            priorPhone,
            reason: "Approvals N/E — destination not send-ready",
          },
        },
      },
    });
    if (row.dealId && row.deal) {
      await tx.ironboardCrmDeal.update({
        where: { id: row.dealId },
        data: {
          stage: row.deal.stage === "PROSPECT" ? "SUSPECT" : row.deal.stage,
          notes: row.deal.notes?.trim()
            ? `${row.deal.notes.trim()}\n${dealNote}`
            : dealNote,
        },
      });
    }
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        interactionId: row.id,
        company: row.contact.company,
        priorEmail,
        priorPhone,
        placeholder,
        dealId: row.dealId,
        demoted: row.deal?.stage === "PROSPECT",
        suspectReportPath: `/dashboard/operations/ironleads/suspects/${row.contact.id}`,
      },
      null,
      2,
    ),
  );
} finally {
  await p.$disconnect();
}
