/**
 * R3 dry-run: retarget a PENDING SALES draft's contact email to an operator inbox.
 * Does NOT dispatch — only updates CRM contact.email so Approvals DISPATCH is safe.
 *
 * Usage:
 *   npx tsx scripts/dev/r3-retarget-dry-run-email.mjs [interactionId] [operatorEmail]
 */
import { PrismaClient } from "@prisma/client";

const interactionId =
  process.argv[2] ?? "8f312d48-1e06-4945-b8ff-f0733dd2ee64"; // BlueRadius EMAIL draft
const operatorEmail = process.argv[3] ?? "dwoods360@gmail.com";

const p = new PrismaClient();

const row = await p.ironboardCrmInteraction.findUnique({
  where: { id: interactionId },
  select: {
    id: true,
    channel: true,
    summary: true,
    contact: { select: { id: true, email: true, phone: true, fullName: true } },
    deal: { select: { title: true } },
  },
});

if (!row?.contact?.id) {
  console.error("FAIL: interaction or contact not found", interactionId);
  process.exit(1);
}

if (!row.summary?.includes("[PENDING SALES DRAFT APPROVAL]")) {
  console.error("FAIL: not a PENDING SALES draft — refusing retarget", {
    id: row.id,
    head: row.summary?.slice(0, 80),
  });
  process.exit(1);
}

const before = row.contact.email;
const updated = await p.ironboardCrmContact.update({
  where: { id: row.contact.id },
  data: { email: operatorEmail },
  select: { id: true, email: true, phone: true, fullName: true },
});

console.log(
  JSON.stringify(
    {
      ok: true,
      interactionId: row.id,
      company: row.deal?.title,
      contactId: updated.id,
      emailBefore: before,
      emailAfter: updated.email,
      phone: updated.phone,
      note: "Approvals UI has no recipient field — DISPATCH uses contact.email. Restore after R3 if needed.",
      next: "Open /dashboard/admin/approvals?kind=SALES → select this draft → Approve & dispatch",
    },
    null,
    2,
  ),
);

await p.$disconnect();
