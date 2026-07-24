import "server-only";

import { normalizeLiveTranscriptChunk } from "@/app/lib/operations/liveTranscriptHygiene";
import {
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  WORKFLOW_REVIEW_CTA_MINUTES,
  formatPathBUsd,
  formatPlannedGaCommandUsd,
} from "@/lib/ironframeProductKnowledge/commercial";

export type BuyingSignalId =
  | "NAMES_PAIN"
  | "ASKS_TIMELINE"
  | "ASKS_PRICE"
  | "ASKS_SECURITY"
  | "COMPETITOR_COMPARE"
  | "INTRO_STAKEHOLDER"
  | "SUCCESS_CRITERIA"
  | "NEXT_STEP_ORDER"
  | "BUDGET_OWNER"
  | "URGENCY_EVENT";

export type BuyingSignal = {
  id: BuyingSignalId;
  label: string;
  strength: "weak" | "medium" | "strong";
  evidence: string[];
  closeHint: string;
};

export type CallAssistAnswer = {
  question: string;
  answer: string;
  banNote: string | null;
};

export type TranscriptAnalysis = {
  analyzedAt: string;
  wordCount: number;
  buyingSignals: BuyingSignal[];
  objections: Array<{ label: string; suggestedReply: string; evidence: string[] }>;
  unansweredProspectQuestions: string[];
  closeReadiness: {
    score: number;
    band: "low" | "medium" | "high";
    summary: string;
    nextMove: string;
  };
  talkTrackReminders: string[];
};

export type WorkflowReviewActionItem = {
  owner: "operator" | "prospect" | "shared";
  text: string;
  priority: "now" | "this_week" | "later";
};

export type WorkflowReviewCallRecap = {
  generatedAt: string;
  company: string;
  contactName: string | null;
  channel: "teams" | "zoom" | "meet" | "other";
  wordCount: number;
  summary: string[];
  buyingSignals: Array<{ label: string; strength: BuyingSignal["strength"] }>;
  objections: Array<{ label: string; suggestedReply: string }>;
  openQuestions: string[];
  actionItems: WorkflowReviewActionItem[];
  pathBAsk: string;
  closeReadiness: TranscriptAnalysis["closeReadiness"];
  markdown: string;
};

const POCKET_QA: Array<{ match: RegExp; answer: string }> = [
  {
    match: /soc\s*2|soc2|iso\s*27001|certified/i,
    answer:
      "We’re SOC2-aligned in architecture and controls; we are not claiming a completed SOC 2 Type II logo today. Diligence is migrations, RLS paths, gateway rules, and your Path B criteria — not paperwork theater.",
  },
  {
    match: /free\s*(trial|poc|pilot)|30[-\s]?day|proof of concept/i,
    answer: `No free tier or loose trial. Entry is flat ${formatPathBUsd()} for a ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day scoped co-builder seat — non-refundable. Convert or exit on criteria you write. If you convert in-window, that ${formatPathBUsd()} is credited to year-1 Command at planned GA list (${formatPlannedGaCommandUsd()}/yr) — a fixed convert credit, not a negotiated %.`,
  },
  {
    match: /discount|credit|paying\s*twice|convert.*price|refund|money\s*back/i,
    answer: `Not a negotiated discount. Path B ${formatPathBUsd()} is non-refundable if you exit. Planned GA Command stays at list (~${formatPlannedGaCommandUsd()}/yr). If you convert within the ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day window, the Path B fee is credited to year-1 Command — recognition of money already paid, not a haggled %.`,
  },
  {
    match: /vanta|drata|heatmap|heatmap/i,
    answer:
      "Keep checklist continuous-control tools if that job is done. We quantify loss exposure in integer cents and isolate entities — different buying job than speed-to-cert.",
  },
  {
    match: /demo|product\s*tour|show\s*me/i,
    answer:
      "This slot is workflow diligence. Product walk comes after Path B interest and written criteria — not instead of them.",
  },
  {
    match: /ale|risk\s*financ|dollar|bigint|cents/i,
    answer:
      "No qualitative 5×5 heatmaps as the board truth. Reporting math is integer cents (BigInt). Exposure tracks to dollar boundaries from live constraints — narrative agents don’t invent ALE.",
  },
  {
    match: /multi[-\s]?tenant|isolation|rls|enclave|bleed/i,
    answer:
      "Containment is at the database / tenant boundary (PostgreSQL RLS + Ironguard). Irongate sanitizes before persist. MSSP-style client enclaves are hard per-client walls — not shared spreadsheet folders.",
  },
  {
    match: /price|cost|4999|\$4,?999|budget/i,
    answer: `Path B / Command Tier is a fixed ${formatPathBUsd()} for the default ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day window with 2–3 written success metrics — non-refundable. Planned GA Command is ~${formatPlannedGaCommandUsd()}/yr at list. Convert in-window and the ${formatPathBUsd()} credits year-1 Command; exit and the fee stays paid. This call locks co-builder entry, not a custom SOW circus.`,
  },
  {
    match: /nda|mutual\s*nda/i,
    answer:
      "Mutual NDA can appear later under a scoped Path B if needed. The immediate gate after a yes is the order form with 2–3 criteria and client-owned operator email — not NDA as the next step from this call.",
  },
];

const SIGNAL_RULES: Array<{
  id: BuyingSignalId;
  label: string;
  strength: BuyingSignal["strength"];
  patterns: RegExp[];
  closeHint: string;
}> = [
  {
    id: "NAMES_PAIN",
    label: "Names concrete evidence / board / isolation pain",
    strength: "medium",
    patterns: [
      /spreadsheet/i,
      /evidence\s*(debt|collection|chase)/i,
      /board\s*(pack|report|deck)/i,
      /multi[-\s]?entit/i,
      /auditor/i,
      /heatmap/i,
    ],
    closeHint: "Mirror their words → map to one structural pattern → Path B criteria.",
  },
  {
    id: "ASKS_TIMELINE",
    label: "Asks about timing / start date",
    strength: "medium",
    patterns: [/when\s+can\s+we\s+start/i, /how\s+soon/i, /this\s+quarter/i, /next\s+month/i],
    closeHint: "Offer order form this week; provision after client-owned operator email.",
  },
  {
    id: "ASKS_PRICE",
    label: "Engages on Path B price / commercial frame",
    strength: "strong",
    patterns: [/4,?999|\$4k|path\s*b|co[-\s]?builder|what\s+does\s+it\s+cost/i],
    closeHint: "Confirm $4,999 / 90-day / 2–3 metrics; ask who signs the order form.",
  },
  {
    id: "ASKS_SECURITY",
    label: "Diligence on security / SOC / isolation",
    strength: "medium",
    patterns: [/soc\s*2|isolation|rls|tenant|irongate|security\s+review/i],
    closeHint: "Stay clinical; offer Path B as the diligence vehicle, not a free PoC.",
  },
  {
    id: "COMPETITOR_COMPARE",
    label: "Compares to Vanta / Drata / incumbent",
    strength: "medium",
    patterns: [/vanta|drata|already\s+use|incumbent|replacing/i],
    closeHint: "Different buying job — keep their checklist tool; sell cents + walls.",
  },
  {
    id: "INTRO_STAKEHOLDER",
    label: "Offers to bring CISO / CFO / partner",
    strength: "strong",
    patterns: [
      /bring\s+(in\s+)?(my\s+)?(ciso|cfo|partner|boss|cto)/i,
      /loop\s+in/i,
      /include\s+\w+\s+on\s+the\s+next/i,
    ],
    closeHint: "Book the next 15 with economic buyer; send one-pager + order form draft.",
  },
  {
    id: "SUCCESS_CRITERIA",
    label: "Discusses success metrics / outcomes",
    strength: "strong",
    patterns: [/success\s+criter/i, /what\s+does\s+good\s+look\s+like/i, /measure/i, /kpi/i],
    closeHint: "Capture 2–3 written criteria live; those go on the order form.",
  },
  {
    id: "NEXT_STEP_ORDER",
    label: "Asks about order form / provisioning / next step",
    strength: "strong",
    patterns: [/order\s+form/i, /next\s+step/i, /send\s+(me\s+)?(the\s+)?(paperwork|form|link)/i, /provision/i],
    closeHint: "Close: order form + client-owned operator email → tenant-scoped Path B link.",
  },
  {
    id: "BUDGET_OWNER",
    label: "Identifies budget / signer",
    strength: "strong",
    patterns: [/i\s+can\s+sign/i, /budget\s+owner/i, /i\s+own\s+the\s+budget/i, /procurement/i],
    closeHint: "Name the signer on the order form before the call ends.",
  },
  {
    id: "URGENCY_EVENT",
    label: "Tied to audit / board / regulatory event",
    strength: "medium",
    patterns: [/board\s+meeting/i, /audit\s+(kickoff|season)/i, /exam/i, /deadline/i, /regulator/i],
    closeHint: "Anchor Path B window to that event date on the order form.",
  },
];

const OBJECTION_RULES: Array<{
  label: string;
  patterns: RegExp[];
  suggestedReply: string;
}> = [
  {
    label: "Wants free trial / PoC",
    patterns: [/free\s*(trial|poc|pilot)/i, /just\s+a\s+poc/i],
    suggestedReply: POCKET_QA[1]!.answer,
  },
  {
    label: "Wants product demo now",
    patterns: [/show\s+me\s+(a\s+)?demo/i, /can\s+we\s+see\s+the\s+product/i],
    suggestedReply: POCKET_QA[3]!.answer,
  },
  {
    label: "Already on Vanta/Drata",
    patterns: [/we\s+(already\s+)?use\s+(vanta|drata)/i, /happy\s+with\s+(vanta|drata)/i],
    suggestedReply: POCKET_QA[2]!.answer,
  },
  {
    label: "SOC 2 logo ask",
    patterns: [/are\s+you\s+soc/i, /soc\s*2\s+certified/i],
    suggestedReply: POCKET_QA[0]!.answer,
  },
];

function excerpt(text: string, index: number, span = 90): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + span);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function findEvidence(text: string, patterns: RegExp[]): string[] {
  const hits: string[] = [];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.index != null) {
      hits.push(excerpt(text, match.index));
    }
  }
  return hits.slice(0, 3);
}

export function assistWorkflowReviewQuestion(questionRaw: string): CallAssistAnswer {
  const question = questionRaw.trim().slice(0, 1_000);
  if (!question) {
    return {
      question: "",
      answer: "Ask a concrete diligence question (SOC 2, price, isolation, Vanta, demo, ALE).",
      banNote: null,
    };
  }

  for (const row of POCKET_QA) {
    if (row.match.test(question)) {
      return {
        question,
        answer: row.answer,
        banNote:
          "Do not cite medshield / vaultbank / gridcore as customers. Human hosts; agent is sidecar only.",
      };
    }
  }

  return {
    question,
    answer: `Stay in peer-to-peer diligence: map their pain to isolation / integer-cent ALE / Irongate, then frame Path B at ${formatPathBUsd()} for ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS} days with 2–3 written success metrics. CTA remains a ${WORKFLOW_REVIEW_CTA_MINUTES} minute workflow review — not a demo circus.`,
    banNote:
      "Do not invent architecture notes they did not state. Do not offer free pilots.",
  };
}

export function analyzeWorkflowReviewTranscript(transcriptRaw: string): TranscriptAnalysis {
  const transcript = normalizeLiveTranscriptChunk(transcriptRaw).slice(0, 80_000);
  const analyzedAt = new Date().toISOString();
  const wordCount = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0;

  const buyingSignals: BuyingSignal[] = [];
  for (const rule of SIGNAL_RULES) {
    const evidence = findEvidence(transcript, rule.patterns);
    if (evidence.length > 0) {
      buyingSignals.push({
        id: rule.id,
        label: rule.label,
        strength: rule.strength,
        evidence,
        closeHint: rule.closeHint,
      });
    }
  }

  const objections = OBJECTION_RULES.flatMap((rule) => {
    const evidence = findEvidence(transcript, rule.patterns);
    if (evidence.length === 0) return [];
    return [{ label: rule.label, suggestedReply: rule.suggestedReply, evidence }];
  });

  const unansweredProspectQuestions = [
    ...transcript.matchAll(/(?:prospect|them|buyer)\s*:\s*([^?]{8,160}\?)/gi),
  ]
    .map((m) => m[1]?.trim() ?? "")
    .filter(Boolean)
    .slice(0, 8);

  // Also catch bare questions if speaker labels missing.
  if (unansweredProspectQuestions.length === 0) {
    const bare = transcript.match(/[^.!?]{12,160}\?/g) ?? [];
    unansweredProspectQuestions.push(...bare.slice(0, 5).map((q) => q.trim()));
  }

  const strengthScore = buyingSignals.reduce((sum, signal) => {
    if (signal.strength === "strong") return sum + 3;
    if (signal.strength === "medium") return sum + 2;
    return sum + 1;
  }, 0);
  const objectionPenalty = Math.min(4, objections.length);
  const score = Math.max(0, Math.min(100, strengthScore * 12 - objectionPenalty * 8));
  const band: TranscriptAnalysis["closeReadiness"]["band"] =
    score >= 60 ? "high" : score >= 30 ? "medium" : "low";

  const hasOrder = buyingSignals.some((s) => s.id === "NEXT_STEP_ORDER" || s.id === "ASKS_PRICE");
  const hasCriteria = buyingSignals.some((s) => s.id === "SUCCESS_CRITERIA");

  let nextMove =
    "Keep diagnosing pain; do not demo. Ask where evidence / board-dollar / multi-entity bleed shows up.";
  if (band === "medium") {
    nextMove = `Frame Path B (${formatPathBUsd()} · ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day · 2–3 criteria) and test for a signer.`;
  }
  if (band === "high" || hasOrder) {
    nextMove = hasCriteria
      ? "Close: capture 2–3 criteria on the order form + client-owned operator email before leaving the call."
      : "Close path open: lock 2–3 written success criteria now, then send the order form.";
  }

  return {
    analyzedAt,
    wordCount,
    buyingSignals,
    objections,
    unansweredProspectQuestions,
    closeReadiness: {
      score,
      band,
      summary:
        band === "high"
          ? "Buying energy is present — push to order form, not another discovery loop."
          : band === "medium"
            ? "Interest is real but incomplete — tighten commercial frame and next step."
            : "Still in diagnosis — earn the right to Path B; do not pitch-slide.",
      nextMove,
    },
    talkTrackReminders: [
      `Human hosts; agent is Q&A sidecar only.`,
      `Agenda: diagnosis → structural mapping → Path B ${formatPathBUsd()} / ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day → engineering gate.`,
      `Banned: demo-tenant slugs as customers; free pilots; Request Demo as primary CTA.`,
    ],
  };
}

export type WorkflowReviewCallSessionInput = {
  company: string;
  contactName?: string;
  channel?: "teams" | "zoom" | "meet" | "other";
  recordingConsent: boolean;
  transcript?: string;
  liveQuestion?: string;
};

export type WorkflowReviewCallSessionResult = {
  ok: true;
  guidance: {
    recording: string[];
    duringCall: string[];
  };
  assist: CallAssistAnswer | null;
  analysis: TranscriptAnalysis | null;
};

export function runWorkflowReviewCallAssist(
  input: WorkflowReviewCallSessionInput,
): WorkflowReviewCallSessionResult {
  const assist = input.liveQuestion?.trim()
    ? assistWorkflowReviewQuestion(input.liveQuestion)
    : null;
  const analysis = input.transcript?.trim()
    ? analyzeWorkflowReviewTranscript(input.transcript)
    : null;

  return {
    ok: true,
    guidance: {
      recording: [
        "IN-CALL (not after): get verbal consent at minute 0, then keep this console open beside Teams.",
        "Turn on Teams live captions (or Zoom/Meet captions). Feed the live buffer via mic listen and/or paste captions as they appear.",
        "Buying signs and close readiness refresh while you talk — do not wait for Recap.",
        "Optional: also Record in Teams for a post-call archive; analysis for closing happens live.",
      ],
      duringCall: [
        "You host; this panel is a silent sidecar — never read it aloud like a script.",
        "When they ask something hard, type it into Live Q&A for a pocket answer.",
        "When a strong buying sign lights up, execute the Close hint immediately (criteria → order form).",
        `Path B lock: ${formatPathBUsd()} · ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day · 2–3 written metrics · non-refundable · in-window convert credit to year-1 Command — not a demo detour.`,
      ],
    },
    assist,
    analysis,
  };
}

function extractProspectCommitments(transcript: string): string[] {
  // Word boundaries matter — without them "bill" matches `ill` and yields
  // "ill We'll meet Probably about" from "tax bill We'll meet…".
  const patterns = [
    /\b(?:i(?:'|’)ll|we(?:'|’)ll|i will|we will|let me|i can)\s+[^.]{8,120}/gi,
    /\b(?:send|share|introduce|loop in|check with|get back)\s+[^.]{8,100}/gi,
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const pattern of patterns) {
    for (const match of transcript.matchAll(pattern)) {
      const phrase = (match[0] ?? "").replace(/\s+/g, " ").trim();
      if (phrase.length < 12) continue;
      // Drop mid-word / garbage starts (legacy ill-from-bill style).
      if (!/^(?:i(?:'|’)ll|we(?:'|’)ll|i will|we will|let me|i can|send|share|introduce|loop in|check with|get back)\b/i.test(phrase)) {
        continue;
      }
      const key = phrase.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(phrase.slice(0, 160));
      if (out.length >= 5) return out;
    }
  }
  return out;
}

const MONTH_NAMES =
  "January|February|March|April|May|June|July|August|September|October|November|December";

export type MeetingFactBundle = {
  scheduledFollowUps: string[];
  topics: string[];
  priorities: string[];
  summaryLines: string[];
};

/**
 * Pull factual next-steps from the buffer (dates, times, vendors, priorities)
 * so ops/sync transcripts are not drowned in Path B diagnosis boilerplate.
 */
export function extractMeetingFacts(transcriptRaw: string): MeetingFactBundle {
  const transcript = transcriptRaw.replace(/\s+/g, " ").trim();
  const scheduledFollowUps: string[] = [];
  const topics: string[] = [];
  const priorities: string[] = [];

  const dateMatches = [
    ...transcript.matchAll(
      new RegExp(
        `\\b(?:meet|meeting|call|sync|reconvene)\\b[^.]{0,80}?\\b((?:${MONTH_NAMES})\\s+\\d{1,2}(?:st|nd|rd|th)?)\\b`,
        "gi",
      ),
    ),
  ];
  const timeMatches = [
    ...transcript.matchAll(
      /\b(?:about|around|at|by)\s+(\d{1,2}(?::\d{2})?(?:\s*(?:a\.?m\.?|p\.?m\.?))?)\b/gi,
    ),
    ...transcript.matchAll(
      /\b(\d{1,2}:\d{2})\s*(?:a\.?m\.?|p\.?m\.?|that\s+morning|that\s+afternoon|that\s+evening)\b/gi,
    ),
  ];
  const date = dateMatches[0]?.[1]?.trim();
  const time = timeMatches[0]?.[1]?.trim();
  if (date || time) {
    scheduledFollowUps.push(
      [date ? `Meet on ${date}` : "Follow-up meeting", time ? `~${time}` : null]
        .filter(Boolean)
        .join(" "),
    );
  }

  if (/\bTextbelt\b/i.test(transcript) || /\bSMS\s+provider\b/i.test(transcript)) {
    topics.push("SMS provider / Textbelt issues");
  }
  if (/\bPath\s*B\b/i.test(transcript)) topics.push("Path B commercial frame");
  if (/\border\s+form\b/i.test(transcript)) topics.push("Order form / next-step paperwork");

  const topicClause = transcript.match(
    /\b(?:discuss|about|regarding)\s+(?:the\s+)?([^.]{10,100})/i,
  );
  if (topicClause?.[1]) {
    const topic = topicClause[1].replace(/\s+/g, " ").trim();
    if (topic && !topics.some((t) => t.toLowerCase().includes(topic.slice(0, 24).toLowerCase()))) {
      topics.push(topic.slice(0, 120));
    }
  }

  if (/\bpriorit(?:y|ies)\b/i.test(transcript)) {
    priorities.push("Marked as a priority in the buffer");
  }

  const summaryLines: string[] = [];
  for (const s of scheduledFollowUps) summaryLines.push(s + ".");
  if (topics.length > 0) summaryLines.push(`Topics: ${topics.join("; ")}.`);
  for (const p of priorities) summaryLines.push(p + ".");

  return { scheduledFollowUps, topics, priorities, summaryLines };
}

export function buildWorkflowReviewCallRecap(input: {
  transcript: string;
  company?: string;
  contactName?: string;
  channel?: "teams" | "zoom" | "meet" | "other";
}): WorkflowReviewCallRecap {
  const company = String(input.company ?? "").trim() || "Prospect";
  const contactName = String(input.contactName ?? "").trim() || null;
  const channel = input.channel ?? "teams";
  const transcript = normalizeLiveTranscriptChunk(String(input.transcript ?? ""));
  const analysis = analyzeWorkflowReviewTranscript(transcript);
  const facts = extractMeetingFacts(transcript);
  const hasCommercialSignal =
    analysis.buyingSignals.length > 0 || analysis.closeReadiness.band !== "low";

  const summary: string[] = [
    `${company}${contactName ? ` · ${contactName}` : ""} — workflow review via ${channel}.`,
  ];
  if (facts.summaryLines.length > 0) {
    summary.push(...facts.summaryLines);
  }
  if (hasCommercialSignal) {
    summary.push(analysis.closeReadiness.summary);
    summary.push(
      analysis.buyingSignals.length > 0
        ? `Buying signs: ${analysis.buyingSignals.map((s) => s.label).join("; ")}.`
        : "No strong buying signs detected in the buffer — more diagnosis needed.",
    );
  } else if (facts.summaryLines.length === 0) {
    summary.push(analysis.closeReadiness.summary);
    summary.push("No strong buying signs detected in the buffer — more diagnosis needed.");
  } else {
    summary.push("No Path B commercial signals in this buffer — treating notes as ops/sync facts.");
  }
  if (analysis.objections.length > 0) {
    summary.push(`Objections heard: ${analysis.objections.map((o) => o.label).join("; ")}.`);
  }

  const actionItems: WorkflowReviewActionItem[] = [];

  for (const followUp of facts.scheduledFollowUps) {
    actionItems.push({
      owner: "shared",
      text: followUp,
      priority: "now",
    });
  }
  for (const topic of facts.topics.slice(0, 3)) {
    actionItems.push({
      owner: "operator",
      text: `Prepare / follow through on: ${topic}`,
      priority: "this_week",
    });
  }

  if (hasCommercialSignal) {
    actionItems.push({
      owner: "operator",
      text: analysis.closeReadiness.nextMove,
      priority: analysis.closeReadiness.band === "high" ? "now" : "this_week",
    });

    if (
      analysis.closeReadiness.band === "high" ||
      analysis.buyingSignals.some((s) => s.id === "NEXT_STEP_ORDER")
    ) {
      actionItems.push({
        owner: "operator",
        text: `Send Path B order form (${formatPathBUsd()} · ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day) with 2–3 written success criteria fields.`,
        priority: "now",
      });
    } else if (analysis.closeReadiness.band === "medium") {
      actionItems.push({
        owner: "operator",
        text: "Send a short follow-up that restates their pain → structural map → Path B frame (no demo detour).",
        priority: "this_week",
      });
    }
  } else if (actionItems.length === 0) {
    actionItems.push({
      owner: "operator",
      text: "No schedule/topic captured — confirm next step in writing before leaving the thread.",
      priority: "this_week",
    });
  }

  if (analysis.buyingSignals.some((s) => s.id === "INTRO_STAKEHOLDER")) {
    actionItems.push({
      owner: "shared",
      text: "Confirm buying-committee intro (CISO/CFO/sponsor) and hold a scoped Path B criteria workshop.",
      priority: "this_week",
    });
  }

  for (const commitment of extractProspectCommitments(transcript)) {
    // Already captured as a dated follow-up — skip redundant "We'll meet…" snippets.
    if (
      facts.scheduledFollowUps.length > 0 &&
      /\b(?:we(?:'|’)ll|i(?:'|’)ll)\s+meet\b/i.test(commitment)
    ) {
      continue;
    }
    actionItems.push({
      owner: "prospect",
      text: `Follow up on: “${commitment}”`,
      priority: "this_week",
    });
  }

  for (const q of analysis.unansweredProspectQuestions.slice(0, 3)) {
    actionItems.push({
      owner: "operator",
      text: `Answer outstanding question in writing: ${q}`,
      priority: "this_week",
    });
  }

  // Dedupe by text
  const seen = new Set<string>();
  const deduped = actionItems
    .filter((item) => {
      const key = `${item.owner}:${item.text.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);

  const pathBAsk = hasCommercialSignal
    ? analysis.closeReadiness.band === "high"
      ? `Ask now: Path B at ${formatPathBUsd()} for ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS} days with 2–3 written success metrics + client-owned operator email.`
      : analysis.closeReadiness.band === "medium"
        ? `Soft ask: if pain is real, the clean next step is Path B (${formatPathBUsd()} / ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day) — not a free PoC.`
        : `Do not hard-pitch yet. Earn Path B by finishing diagnosis; keep CTA as another ${WORKFLOW_REVIEW_CTA_MINUTES}-min diligence only if warranted.`
    : "No Path B ask from this buffer — capture the scheduled follow-up and ops topic first.";

  const markdownLines = [
    `# Workflow review recap — ${company}`,
    "",
    `- Contact: ${contactName ?? "—"}`,
    `- Channel: ${channel}`,
    `- Close readiness: ${analysis.closeReadiness.band} (${analysis.closeReadiness.score}/100)`,
    `- Words in buffer: ${analysis.wordCount}`,
    "",
    "## Summary",
    ...summary.map((s) => `- ${s}`),
    "",
    "## Path B ask",
    pathBAsk,
    "",
    "## Action items",
    ...deduped.map((a) => `- (${a.owner} · ${a.priority}) ${a.text}`),
    "",
    "## Buying signs",
    ...(analysis.buyingSignals.length
      ? analysis.buyingSignals.map((s) => `- ${s.label} [${s.strength}]`)
      : ["- None detected"]),
    "",
    "## Objections",
    ...(analysis.objections.length
      ? analysis.objections.map((o) => `- ${o.label}: ${o.suggestedReply}`)
      : ["- None detected"]),
    "",
    "## Open questions",
    ...(analysis.unansweredProspectQuestions.length
      ? analysis.unansweredProspectQuestions.map((q) => `- ${q}`)
      : ["- None captured"]),
  ];

  return {
    generatedAt: new Date().toISOString(),
    company,
    contactName,
    channel,
    wordCount: analysis.wordCount,
    summary,
    buyingSignals: analysis.buyingSignals.map((s) => ({
      label: s.label,
      strength: s.strength,
    })),
    objections: analysis.objections.map((o) => ({
      label: o.label,
      suggestedReply: o.suggestedReply,
    })),
    openQuestions: analysis.unansweredProspectQuestions,
    actionItems: deduped,
    pathBAsk,
    closeReadiness: analysis.closeReadiness,
    markdown: markdownLines.join("\n"),
  };
}
