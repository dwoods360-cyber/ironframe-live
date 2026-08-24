/**
 * Polish Aug 17 Touch 2 drafts to human founder voice (spoken, short lines).
 * PREP ONLY — does not DISPATCH.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { lintSalesHumanVoice } from "../../app/lib/salesHumanVoice.ts";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const PENDING = "[PENDING SALES DRAFT APPROVAL]";
const SIG = ["Best,", "Dereck", "Founder, Ironframe", "dereck@ironframegrc.com"].join("\n");

function pack(subject, companyLabel, body) {
  return [
    `${PENDING} ${subject}`,
    "--- Agent Proposed Reply Text ---",
    body,
    "--- Prospect Context ---",
    "Beachhead Sector: MSSP_ENCLAVE",
    "Quantified loss exposure (¢): pending operator baseline bind",
    `HITL note: Touch 2 day 4–5 for ${companyLabel} (Aug 17). Human voice lock — spoken founder lines; board-writer clarity bar; PREP ONLY.`,
    "Cadence: TOUCH2",
    "Execution Source: salesTeamPoll | Channel:EMAIL",
  ].join("\n");
}

const DRAFTS = [
  {
    id: "3c1ab383-15f7-4fba-9249-b80317327b0d",
    companyLabel: "Abacus",
    subject: "Re: multi-client evidence isolation across AbacusFlex environments",
    body: [
      "Hi Jonathan,",
      "",
      "When you're managing financial-services and healthcare accounts on AbacusFlex, how do you keep each client's compliance evidence and board reporting isolated today — without shared-stack register risk?",
      "",
      "We're keeping this Design Partner group to 3–5 MSP/MSSP operators so we can build around your team's workflow, not a generic roadmap.",
      "",
      "The economics stay simple. $4,999 flat for a 90-day seat around 2–3 criteria you set.",
      "Planned GA for Ironframe Command is ~$35,000/yr.",
      "",
      "If client-isolated evidence is on your radar this quarter, are you open to a 10–15 minute workflow review next week — peer to peer, not a product tour?",
      "",
      SIG,
    ].join("\n"),
  },
  {
    id: "717897a3-edc6-4d1c-b58f-c1e28bdb670d",
    companyLabel: "Absolute Logic",
    subject: "Re: co-builder seat — Absolute Logic",
    body: [
      "Hi Ruppert,",
      "",
      "When Absolute Logic runs HIPAA, GLBA, and NYDFS work across managed client environments, how do you keep each client's evidence registers isolated today — without shared-stack register risk?",
      "",
      "We're keeping this Design Partner group to 3–5 MSP/MSSP operators so we can build around your team's workflow, not a generic roadmap.",
      "",
      "The economics stay simple. $4,999 flat for a 90-day seat around 2–3 criteria you set.",
      "Planned GA for Ironframe Command is ~$35,000/yr.",
      "",
      "If client-isolated compliance evidence is on your radar this quarter, are you open to a 10–15 minute workflow review next week — peer to peer, not a product tour?",
      "",
      SIG,
    ].join("\n"),
  },
  {
    id: "205f9acb-e1da-4422-b278-46ce5c251319",
    companyLabel: "Netrio",
    subject: "Re: co-builder seat — Netrio",
    body: [
      "Hi Mark,",
      "",
      "As Netrio brings Agio financial-services environments into your managed footprint, how do you keep each client's GRC and board reporting isolated today — without shared-stack register risk?",
      "",
      "We're keeping this Design Partner group to 3–5 MSP/MSSP operators so we can build around your team's workflow, not a generic roadmap.",
      "",
      "The economics stay simple. $4,999 flat for a 90-day seat around 2–3 criteria you set.",
      "Planned GA for Ironframe Command is ~$35,000/yr.",
      "",
      "If client-isolated GRC and board reporting is on your radar this quarter, are you open to a 10–15 minute workflow review next week — peer to peer, not a product tour?",
      "",
      SIG,
    ].join("\n"),
  },
  {
    id: "437de5c3-2d5c-4d99-8959-aa29541f9dbf",
    companyLabel: "Alvarez Technology Group",
    subject: "Re: co-builder seat — Alvarez Technology Group",
    body: [
      "Hi Luis,",
      "",
      "When Alvarez runs CMMC readiness across DIB and regulated SMB engagements, how do you keep each client's evidence registers isolated today — without shared-stack register risk?",
      "",
      "We're keeping this Design Partner group to 3–5 MSP/MSSP operators so we can build around your team's workflow, not a generic roadmap.",
      "",
      "The economics stay simple. $4,999 flat for a 90-day seat around 2–3 criteria you set.",
      "Planned GA for Ironframe Command is ~$35,000/yr.",
      "",
      "If client-isolated CMMC evidence is on your radar this quarter, are you open to a 10–15 minute workflow review next week — peer to peer, not a product tour?",
      "",
      SIG,
    ].join("\n"),
  },
  {
    id: "90c1e6dc-9a09-43c9-9e03-34edbdfe7635",
    companyLabel: "AMSYS",
    subject: "Re: co-builder seat — AMSYS",
    body: [
      "Hi Khalid,",
      "",
      "When AMSYS delivers managed IT and cybersecurity across multi-vertical client environments, how do you keep each client's compliance evidence and board reporting isolated today — without shared-stack register risk?",
      "",
      "We're keeping this Design Partner group to 3–5 MSP/MSSP operators so we can build around your team's workflow, not a generic roadmap.",
      "",
      "The economics stay simple. $4,999 flat for a 90-day seat around 2–3 criteria you set.",
      "Planned GA for Ironframe Command is ~$35,000/yr.",
      "",
      "If client-isolated evidence and board reporting is on your radar this quarter, are you open to a 10–15 minute workflow review next week — peer to peer, not a product tour?",
      "",
      SIG,
    ].join("\n"),
  },
];

const prisma = new PrismaClient();

try {
  const updated = [];
  for (const d of DRAFTS) {
    const voice = lintSalesHumanVoice(d.body);
    const summary = pack(d.subject, d.companyLabel, d.body);
    await prisma.ironboardCrmInteraction.update({
      where: { id: d.id },
      data: { summary: summary.slice(0, 12_000), occurredAt: new Date() },
    });
    updated.push({
      id: d.id,
      companyLabel: d.companyLabel,
      voiceOk: voice.ok,
      voiceIssues: voice.issues,
      approvalsHref: `https://ironframegrc.com/dashboard/admin/approvals?kind=SALES&draft=${d.id}`,
    });
  }
  console.log(JSON.stringify({ ok: true, updated }, null, 2));
} finally {
  await prisma.$disconnect();
}
