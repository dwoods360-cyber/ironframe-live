/**
 * Short lesson cards per Fellows mission — learning goals + what the lab proves.
 * Shared by landing + lab console (not full LMS modules).
 */

export type FellowsMissionLesson = {
  number: 1 | 2 | 3 | 4;
  code: "01" | "02" | "03" | "04";
  title: string;
  /** One-line what the hands-on step does */
  labAction: string;
  /** What the student will learn / should be able to explain */
  youWillLearn: string[];
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
