/**
 * Fellows mission lessons — teach → check → unlock lab run.
 * Shared by landing (preview) + lab console (gated practice).
 */

export type FellowsMissionLesson = {
  number: 1 | 2 | 3 | 4;
  code: "01" | "02" | "03" | "04";
  title: string;
  /** One-line what the hands-on step does */
  labAction: string;
  /** What the student will learn / should be able to explain */
  youWillLearn: string[];
  /** Short teaching paragraphs shown before the check */
  teach: string[];
  /** Comprehension check — must pass before lab execute unlocks */
  check: {
    prompt: string;
    options: { id: string; label: string }[];
    /** Correct option id */
    correctId: string;
    explainCorrect: string;
  };
  /** What a PASS proves in this sandbox */
  youProve: string;
  /** Optional off-platform write-up prompt (capstone / portfolio) */
  writeUpPrompt: string;
};

export const FELLOWS_MISSION_LESSONS: FellowsMissionLesson[] = [
  {
    number: 1,
    code: "01",
    title: "Exposure stress-test",
    labAction:
      "Adjust single-loss bounds and occurrence rates to verify deterministic whole-cent estimated exposure.",
    youWillLearn: [
      "Why estimated loss exposure should be stored and computed in whole cents (not float dollars).",
      "How to state assumptions (SLE bounds, occurrence rate) so a figure is defendable in a write-up.",
      "Why “color-only” risk matrices are weak as a sole decision layer for capital questions.",
    ],
    teach: [
      "Boards and evaluators often ask for dollar exposure. A 5×5 heatmap can rank “High,” but it does not by itself show estimated loss in money or the assumptions behind the number.",
      "Ironframe’s academic lab stores and computes estimated exposure in whole integer cents (BIGINT). That removes floating-point drift and forces you to name SLE bounds and occurrence rate as assumptions.",
      "Label the output carefully: it is estimated exposure with visible assumptions — not “true ALE” and not accounting dollars. Heatmaps may remain context; they should not be the only decision layer.",
    ],
    check: {
      prompt: "What does this mission require you to defend academically?",
      options: [
        {
          id: "a",
          label: "A single “true ALE” dollar figure with no listed assumptions",
        },
        {
          id: "b",
          label:
            "Estimated exposure in whole cents, with SLE/ARO assumptions stated and server-proven math",
        },
        {
          id: "c",
          label: "Only a red/amber/green heatmap cell as the capital answer",
        },
      ],
      correctId: "b",
      explainCorrect:
        "Correct — whole-cent estimated exposure + visible assumptions; the server receipt proves the math was not client-mocked.",
    },
    youProve:
      "Server-computed estimated exposure bounds in integer cents, with a mission receipt (not client-mocked math).",
    writeUpPrompt:
      "Document your SLE/ARO assumptions and explain why the result is labeled estimated exposure—not true ALE or accounting dollars.",
  },
  {
    number: 2,
    code: "02",
    title: "Untrusted ingest gate",
    labAction:
      "Attempt to promote an unverified vendor questionnaire into an executive pack and observe the quarantine block.",
    youWillLearn: [
      "The difference between collecting an external artifact and trusting it for executive output.",
      "Why quarantine-before-trust reduces promotion of unverified third-party content.",
      "How to describe an ingest control failure mode in methodology language.",
    ],
    teach: [
      "Collection is not verification. A vendor questionnaire can land in the inbox and still be unfit for an executive pack until verification status allows promotion.",
      "Quarantine-before-trust means the platform refuses to promote an UNVERIFIED artifact into trusted output. In this lab, the “failure” you want is the block — that is the control working.",
      "For capstone writing, describe the control as: untrusted ingest → quarantine → human/verification path → then promote. Do not treat a PDF questionnaire alone as continuous assurance.",
    ],
    check: {
      prompt: "In this lab, what is the correct outcome when you try to promote an unverified vendor questionnaire?",
      options: [
        {
          id: "a",
          label: "It should auto-promote because the file was collected successfully",
        },
        {
          id: "b",
          label: "It should soft-tag the file “vendor” and still include it in the executive pack",
        },
        {
          id: "c",
          label:
            "Promotion should be blocked by quarantine-before-trust, with a server receipt of the block",
        },
      ],
      correctId: "c",
      explainCorrect:
        "Correct — the mission PASSes when the server blocks promote and issues a receipt, not when the questionnaire ships to the pack.",
    },
    youProve:
      "Server-side quarantine refusal (promote blocked) plus a mission receipt for the blocked action.",
    writeUpPrompt:
      "Contrast point-in-time questionnaire theater with a quarantine-before-trust stance; cite the blocked promote as evidence.",
  },
  {
    number: 3,
    code: "03",
    title: "Boundary audit",
    labAction:
      "Run an unauthorized cross-enclave query against another client register and capture the server-issued 403 receipt.",
    youWillLearn: [
      "Why soft tags on a shared stack are not the same as hard enclave isolation.",
      "How a denied cross-tenant read (403) can be evidence—not merely an error message.",
      "What to capture for an isolation narrative (source enclave, target enclave, receipt).",
    ],
    teach: [
      "Multi-client GRC often fails quietly: one login, shared tables, and a “client = X” label. That soft tenancy can leak registers across enclaves under exam pressure.",
      "This mission runs a cross-enclave probe from Client A toward Client B. A correct control returns 403 with zero rows from B — and a server-issued receipt you can cite.",
      "Do not brand this lab as “Postgres RLS” unless that is the actual mechanism under test. Here the academic claim is hard enclave boundary + 403 receipt, not a database feature slogan.",
    ],
    check: {
      prompt: "What counts as proof of isolation in Mission 03?",
      options: [
        {
          id: "a",
          label: "A UI badge that says “multi-tenant” even if rows from Client B are returned",
        },
        {
          id: "b",
          label:
            "A server-issued 403 on the cross-enclave probe, zero bleed, and a consumable receipt",
        },
        {
          id: "c",
          label: "A client-side JavaScript alert that pretends access was denied",
        },
      ],
      correctId: "b",
      explainCorrect:
        "Correct — PASS requires server 403 + receipt. Client-mocked denials are theater.",
    },
    youProve:
      "Server-issued 403 on cross-enclave probe with zero bleed and a consumable mission receipt.",
    writeUpPrompt:
      "Write a short isolation narrative: what was attempted, why 403 is proof, and how that differs from label-only tenancy.",
  },
  {
    number: 4,
    code: "04",
    title: "Lineage export",
    labAction:
      "Export the lab audit register with collector, timestamp, scope hash, and operator sign-off; verify SHA-256.",
    youWillLearn: [
      "Which lineage fields make an evidence register citation-ready (who/when/scope/status).",
      "Why export hashes should be server-issued rather than trusted from the browser alone.",
      "How to package lab artifacts as technical appendices without overstating certification.",
    ],
    teach: [
      "Evaluators and auditors ask: who collected this, when, under what scope, and who signed off? Lineage fields answer that — not a screenshot of a green check alone.",
      "This mission exports a JSON or CSV register and computes SHA-256 on the server. You download the package and keep the hash for appendix integrity.",
      "Completion here is a lab completion hash / export pack — useful for coursework — not an accredited industry certification.",
    ],
    check: {
      prompt: "Why does Mission 04 insist on a server-issued SHA-256 for the export pack?",
      options: [
        {
          id: "a",
          label: "So the browser can invent any hash the student types into a form",
        },
        {
          id: "b",
          label:
            "So the package integrity is tamper-evident and not solely client-attested",
        },
        {
          id: "c",
          label: "So Ironframe can claim the student earned a formal certification",
        },
      ],
      correctId: "b",
      explainCorrect:
        "Correct — server hash makes the export package tamper-evident for appendix use; it is not a certification.",
    },
    youProve:
      "Tamper-evident JSON/CSV package with server SHA-256 and a lineage mission receipt.",
    writeUpPrompt:
      "Attach the hashed register as an appendix and describe how lineage fields support evaluator review.",
  },
];

export function fellowsMissionLesson(
  missionNumber: 1 | 2 | 3 | 4,
): FellowsMissionLesson {
  const lesson = FELLOWS_MISSION_LESSONS.find((m) => m.number === missionNumber);
  if (!lesson) throw new Error(`Unknown fellows mission ${missionNumber}`);
  return lesson;
}

export function isFellowsLessonCheckCorrect(
  missionNumber: 1 | 2 | 3 | 4,
  selectedOptionId: string,
): boolean {
  return fellowsMissionLesson(missionNumber).check.correctId === selectedOptionId;
}
