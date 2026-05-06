"use server";

import { createHash } from "crypto";
import prisma from "@/lib/prisma";
import { getCompanyIdForActiveTenant } from "@/app/lib/grc/clearanceThreatResolve";
import { computePlatformForensicSealHash } from "@/lib/crypto";
import { getForensicReasoningPlayback, type FlemmingForensicReasoningLogV1 } from "@/app/actions/sentinelActions";
import {
  GRC_GOLD_FORENSIC_RECEIPT_SUBTITLE,
  GRC_GOLD_FORENSIC_RECEIPT_TITLE,
  GRC_GOLD_PDF_SECTION_AGENT13,
  GRC_GOLD_PDF_SECTION_AGENT5,
  GRC_GOLD_PDF_SECTION_HASHES,
  GRC_GOLD_PDF_SECTION_PLATFORM_SEAL,
  GRC_GOLD_PDF_SECTION_SIGNATURE,
  GRC_GOLD_PDF_SECTION_WATERFALL,
  GRC_GOLD_PDF_FOOTER_AUTHORITY,
  GRC_GOLD_WATERFALL_STAGE_IRONSCRIBE,
  GRC_GOLD_WATERFALL_STAGE_IRONTRUST,
  GRC_GOLD_WATERFALL_STAGE_IRONWATCH,
} from "@/lib/constants/grcGold";

export type GenerateForensicReceiptResult =
  | { ok: true; base64Pdf: string; filename: string }
  | { ok: false; error: string };

function buildWaterfallTextFromLog(log: FlemmingForensicReasoningLogV1 | null): string {
  if (!log) return "(no forensic_reasoning_log — waterfall unavailable)";
  return [
    `${GRC_GOLD_WATERFALL_STAGE_IRONSCRIBE}`,
    `  Document SHA-256: ${log.agent5IronscribeCitation.sourceDocumentHashSha256}`,
    `  Page reference: ${log.agent5IronscribeCitation.pageReference}`,
    `${GRC_GOLD_WATERFALL_STAGE_IRONTRUST}`,
    `  Governed impact (cents): ${log.agent3IrontrustDeterministic.governedImpactCentsDecimal ?? "—"}`,
    `  ${log.agent3IrontrustDeterministic.formulaExplanation}`,
    `${GRC_GOLD_WATERFALL_STAGE_IRONWATCH}`,
    `  Semantic distance: ${log.ironwatchAgent13.semanticDistance.toFixed(4)}`,
    `  Hybrid score: ${log.ironwatchAgent13.vectorRecallScore.toFixed(4)}`,
    `  Low-confidence drift: ${log.ironwatchAgent13.lowConfidenceSemanticDrift ? "yes" : "no"}`,
  ].join("\n");
}

function buildReceiptBodyText(input: {
  riskId: string;
  title: string;
  governanceHash: string | null;
  signatureLine: string;
  agent5Block: string;
  agent13Block: string;
  waterfallBlock: string;
  issuedAtIso: string;
}): string {
  return [
    GRC_GOLD_FORENSIC_RECEIPT_TITLE,
    GRC_GOLD_FORENSIC_RECEIPT_SUBTITLE,
    "",
    `Risk ID: ${input.riskId}`,
    `Title: ${input.title}`,
    `Issued (UTC): ${input.issuedAtIso}`,
    "",
    GRC_GOLD_PDF_SECTION_HASHES,
    input.governanceHash ?? "(none)",
    "",
    GRC_GOLD_PDF_SECTION_SIGNATURE,
    input.signatureLine,
    "",
    GRC_GOLD_PDF_SECTION_WATERFALL,
    input.waterfallBlock,
    "",
    GRC_GOLD_PDF_SECTION_AGENT5,
    input.agent5Block,
    "",
    GRC_GOLD_PDF_SECTION_AGENT13,
    input.agent13Block,
  ].join("\n");
}

/**
 * Professional PDF forensic receipt: hashes, attestation, Agent 5 & 13 reasoning excerpts, platform seal.
 */
export async function generateForensicReceipt(riskId: string): Promise<GenerateForensicReceiptResult> {
  const tid = riskId?.trim();
  if (!tid) return { ok: false, error: "Risk id is required." };

  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) return { ok: false, error: "Missing company context." };

  const row = await prisma.riskEvent.findFirst({
    where: { id: tid, tenantCompanyId: companyId },
    select: { id: true, title: true, governanceHash: true, forensicSeal: true },
  });
  if (!row) return { ok: false, error: "Risk event not found for this tenant." };

  const bundle = await getForensicReasoningPlayback(tid);
  if (!bundle.ok) return { ok: false, error: bundle.error };

  const seal = bundle.forensicSeal ?? {};
  const sig =
    typeof seal.productOwnerSignature === "string" && seal.productOwnerSignature.trim()
      ? seal.productOwnerSignature.trim()
      : "(signature not present in forensic_seal)";

  const log = bundle.log;
  const agent5 =
    log != null
      ? `Document SHA-256: ${log.agent5IronscribeCitation.sourceDocumentHashSha256}\nPage ref: ${log.agent5IronscribeCitation.pageReference}`
      : "(no forensic_reasoning_log.agent5)";
  const agent13 =
    log != null
      ? `Semantic distance: ${log.ironwatchAgent13.semanticDistance.toFixed(4)}\nHybrid score: ${log.ironwatchAgent13.vectorRecallScore.toFixed(4)}\nLow-confidence drift: ${log.ironwatchAgent13.lowConfidenceSemanticDrift ? "yes" : "no"}`
      : "(no forensic_reasoning_log.agent13)";

  const issuedAtIso = new Date().toISOString();
  const gh = bundle.governanceHash ?? row.governanceHash ?? "";

  const bodyText = buildReceiptBodyText({
    riskId: row.id,
    title: row.title,
    governanceHash: gh || null,
    signatureLine: sig,
    agent5Block: agent5,
    agent13Block: agent13,
    waterfallBlock: buildWaterfallTextFromLog(log),
    issuedAtIso,
  });

  const documentBodySha256 = createHash("sha256").update(bodyText, "utf8").digest("hex");
  const platformSeal = computePlatformForensicSealHash({
    riskId: row.id,
    governanceHash: gh || "(none)",
    issuedAtIso,
    documentBodySha256,
  });

  const fullText =
    bodyText +
    "\n\n" +
    GRC_GOLD_PDF_SECTION_PLATFORM_SEAL +
    "\n" +
    platformSeal +
    "\n\nDocument body SHA-256:\n" +
    documentBodySha256;

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.text(GRC_GOLD_FORENSIC_RECEIPT_TITLE, 14, 18);
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(fullText, 182);
  doc.text(lines, 14, 26);
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 90);
  doc.text(GRC_GOLD_PDF_FOOTER_AUTHORITY, 14, pageH - 10);
  doc.setTextColor(0, 0, 0);
  const buf = doc.output("arraybuffer") as ArrayBuffer;
  const base64Pdf = Buffer.from(buf).toString("base64");
  const filename = `forensic-receipt-${row.id.slice(0, 12)}.pdf`;

  return { ok: true, base64Pdf, filename };
}
