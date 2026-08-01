/**
 * Close Ops Hub calendar activities that are already complete per launch checklist
 * / QA cleanup. Requires DATABASE_URL (use --env-file=.env.local).
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

/** @type {Array<{ sourceRef: string; status: "DONE" | "CANCELLED"; outcome: string }>} */
const CLOSES = [
  {
    sourceRef: "rollout/dp-pre-outreach-gate",
    status: "DONE",
    outcome:
      "PASS 2026-07-19 — A1–A4 on design-partner-operator-launch-checklist.md all clear (contact lead-only; Path B test Checkout mint; Resend+Textbelt; offer/sequence locks).",
  },
  {
    sourceRef: "marketing/live-surfaces-credibility-spotcheck",
    status: "DONE",
    outcome:
      "PASS 2026-07-18 — A1 prod spot-check: /register/contact lead-only; onboarding Path B label; get-started GRC≠CRM; public credibility surfaces coherent.",
  },
  {
    sourceRef: "marketing/path-b-stripe-activation-confirm",
    status: "DONE",
    outcome:
      "PASS 2026-07-19 — A2: Stripe test Checkout Session minted for throwaway slug via scripts/dev/a2-pathb-activation-dry-run.mjs ($4,999 Path B); live refused; never send PENDING to generic /pricing.",
  },
  {
    sourceRef: "rollout/sms-dispatch-smoke",
    status: "DONE",
    outcome:
      "PASS 2026-07-19 — A3: SMS path ready via Textbelt (quota≈199); Resend ironframegrc.com verified. Twilio not required for current DISPATCH provider.",
  },
  {
    sourceRef: "rollout/dp-icp-shortlist",
    status: "DONE",
    outcome:
      "PASS 2026-07-19 — B1 ICP shortlist filled (attack order + §C research); B3 prospect-pool has Pivot Point + BlueRadius PROSPECTs. Warm A1–A5 slots empty by design (no warm network).",
  },
  {
    sourceRef: "marketing/warm-network-advisor-asks",
    status: "CANCELLED",
    outcome:
      "N/A 2026-07-19 — B2: no warm network / advisor intros available; deferred until a real intro appears. Cold path proceeds from prospect-pool.",
  },
  {
    sourceRef: "inbound-lead:ironframe-test-enclave",
    status: "CANCELLED",
    outcome:
      "QA/test inbound — not a real prospect. Cancelled so SLA cron and Ops calendar stop tracking throwaway lead.",
  },
  {
    sourceRef: "inbound-lead:ironframe-test",
    status: "CANCELLED",
    outcome:
      "QA/test inbound — not a real prospect. Cancelled so SLA cron and Ops calendar stop tracking throwaway lead.",
  },
  {
    sourceRef: "wf-recap:dry-run:0118c5b03909",
    status: "DONE",
    outcome: "Workflow-review dry-run / test follow-up — closed; not a live prospect commitment.",
  },
  {
    sourceRef: "wf-recap:prospect:a2d02dbb2366",
    status: "DONE",
    outcome: "Workflow-review test follow-up — closed; not a live prospect commitment.",
  },
  {
    sourceRef: "wf-recap:prospect:5458d5eb6505",
    status: "DONE",
    outcome: "Workflow-review test follow-up — closed; not a live prospect commitment.",
  },
  {
    sourceRef: "wf-recap:prospect:6d1e53c2ce97",
    status: "DONE",
    outcome: "Workflow-review test follow-up — closed; not a live prospect commitment.",
  },
];

async function persistOutcome(id, outcome) {
  await p.$executeRaw`
    UPDATE ops_activities SET outcome = ${outcome}, updated_at = NOW() WHERE id = ${id}
  `;
}

try {
  const results = [];
  for (const spec of CLOSES) {
    const row = await p.opsActivity.findFirst({
      where: { sourceRef: spec.sourceRef },
    });
    if (!row) {
      results.push({ sourceRef: spec.sourceRef, result: "MISSING" });
      continue;
    }
    if (row.status === "DONE" || row.status === "CANCELLED") {
      results.push({
        sourceRef: spec.sourceRef,
        id: row.id,
        result: `ALREADY_${row.status}`,
      });
      continue;
    }
    await p.opsActivity.update({
      where: { id: row.id },
      data: {
        status: spec.status,
        completedAt: new Date(),
      },
    });
    await persistOutcome(row.id, spec.outcome);
    results.push({
      sourceRef: spec.sourceRef,
      id: row.id,
      title: row.title,
      result: spec.status,
    });
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await p.$disconnect();
}
