import "server-only";

import { createHmac } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { readGovernanceMaturityState } from "@/app/lib/governanceMaturityState";
import { signInvestorReportDownloadTokenWithTtl } from "@/app/lib/investorReportShareToken";
import { calculateCarbonRoiVmats } from "@/app/services/ironbloom/roiCalculator";
import { draftIronethicImpactStatement } from "@/app/services/ironethic/impactNarrative";
import {
  buildPublicSustainabilityDisclosureV1,
  generateCarbonResilienceBadgeSvg,
  generateTruthBadgeSvg,
  type PublicSustainabilityDisclosureV1,
} from "@/src/services/ironscribe/publicFormatter";

const TRANSPARENCY_DIR = join(process.cwd(), "storage", "transparency");
const LATEST_PUBLIC_FILE = join(TRANSPARENCY_DIR, "latest-public.json");

const DEFAULT_PUBLIC_PDF_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export type TransparencyPublicBundleV1 = {
  schema: "ironframe.transparency_public_bundle.v1";
  generatedAt: string;
  disclosure: PublicSustainabilityDisclosureV1;
  /** Time-bound HMAC link to the PDF served from WORM mirror path. */
  pdfDownloadUrl: string;
  /** Absolute or site-relative URL for the live truth SVG badge. */
  truthBadgeUrl: string;
  /** Absolute or site-relative URL for investor carbon resilience SVG. */
  carbonResilienceBadgeUrl: string;
  cmsWebhookLastAttempt?: {
    at: string;
    ok: boolean;
    httpStatus?: number;
    error?: string;
  };
};

export function getPublicAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}

function publicPdfLinkTtlMs(): number {
  const raw = process.env.TRANSPARENCY_PDF_LINK_TTL_MS?.trim();
  if (!raw) return DEFAULT_PUBLIC_PDF_TTL_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 60_000 ? n : DEFAULT_PUBLIC_PDF_TTL_MS;
}

function buildPdfDownloadUrl(origin: string, token: string): string {
  const path = `/api/grc/investor-reports/download?t=${encodeURIComponent(token)}`;
  return `${origin}${path}`;
}

function buildTruthBadgeUrl(origin: string): string {
  return `${origin}/api/public/truth-badge.svg`;
}

function buildCarbonResilienceBadgeUrl(origin: string): string {
  return `${origin}/api/public/carbon-resilience-badge.svg`;
}

export function readTransparencyPublicBundleSync(): TransparencyPublicBundleV1 | null {
  try {
    if (!existsSync(LATEST_PUBLIC_FILE)) return null;
    return JSON.parse(readFileSync(LATEST_PUBLIC_FILE, "utf8")) as TransparencyPublicBundleV1;
  } catch {
    return null;
  }
}

export async function pushTransparencyBundleToCms(
  bundle: TransparencyPublicBundleV1,
): Promise<{ ok: boolean; skipped?: boolean; httpStatus?: number; error?: string }> {
  const url = process.env.TRANSPARENCY_PAGE_WEBHOOK_URL?.trim();
  if (!url) return { ok: true, skipped: true };

  const secret = process.env.TRANSPARENCY_PAGE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return { ok: false, error: "TRANSPARENCY_PAGE_WEBHOOK_SECRET is not configured." };
  }

  const payload = {
    event: "ironframe.transparency.disclosure.v1" as const,
    disclosure: bundle.disclosure,
    pdfLink: bundle.pdfDownloadUrl,
    truthBadgeUrl: bundle.truthBadgeUrl,
    carbonResilienceBadgeUrl: bundle.carbonResilienceBadgeUrl,
    gavelFooter: bundle.disclosure.gavelFooter,
    generatedAt: bundle.generatedAt,
    verification: bundle.disclosure.verification,
  };

  const raw = JSON.stringify(payload);
  const sig = createHmac("sha256", secret).update(raw).digest("hex");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Ironframe-Transparency-Signature": `sha256=${sig}`,
        "User-Agent": "Ironframe-Transparency-Engine/1.0",
      },
      body: raw,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        httpStatus: res.status,
        error: text.slice(0, 500) || `HTTP ${res.status}`,
      };
    }
    return { ok: true, httpStatus: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function writeBundle(bundle: TransparencyPublicBundleV1): void {
  if (!existsSync(TRANSPARENCY_DIR)) mkdirSync(TRANSPARENCY_DIR, { recursive: true });
  writeFileSync(LATEST_PUBLIC_FILE, JSON.stringify(bundle, null, 2), "utf8");
  const svg = generateTruthBadgeSvg({
    maturityScore: bundle.disclosure.maturityScoreDisplay,
    streakDays: bundle.disclosure.streakDaysDisplay,
    href: bundle.pdfDownloadUrl,
  });
  writeFileSync(join(TRANSPARENCY_DIR, "truth-badge.snapshot.svg"), svg, "utf8");
  const maturityNum = Number.parseFloat(bundle.disclosure.maturityScoreDisplay);
  const crSvg = generateCarbonResilienceBadgeSvg({
    maturityScore: Number.isFinite(maturityNum) ? maturityNum : 7,
    href: bundle.pdfDownloadUrl,
  });
  writeFileSync(join(TRANSPARENCY_DIR, "carbon-resilience-badge.snapshot.svg"), crSvg, "utf8");
}

/**
 * Builds privacy-safe disclosure, persists `storage/transparency/latest-public.json`, optionally POSTs to CMS webhook.
 * Called after a 30-day Sustainability Achievement report is written.
 */
export async function persistAndDispatchPublicTransparency(input: {
  generatedAt: string;
  milestoneDays: number;
  mitigatedSustainabilityAleCents: bigint;
  totalKwhSaved: bigint;
  averageGridIntensityGco2PerKwh: number | null;
  gridIntensityDeltaGco2PerKwh: number | null;
  constitutionalTasSha256: string | null;
  pdfArtifactSha256: string;
  relativePath: string;
  wormGsUri: string;
  compositeInternalSha256?: string;
}): Promise<{ bundle: TransparencyPublicBundleV1; webhook: { ok: boolean; skipped?: boolean; error?: string } }> {
  const maturityRow = await readGovernanceMaturityState();
  const maturityScore = maturityRow.current.score;
  const activeStreakDays = input.milestoneDays;

  const roi = await calculateCarbonRoiVmats({
    totalKwhSaved: input.totalKwhSaved,
    averageIntensityGco2PerKwh: input.averageGridIntensityGco2PerKwh,
    reportingWindowDays: 30,
    requireThrottleEvidence: process.env.VMAT_REQUIRE_THROTTLE_EVIDENCE === "1",
  });

  const ironethicStatement = draftIronethicImpactStatement({
    avoidedMetricTons: roi.avoidedCarbonMetricTons,
    societalValueCents: roi.societalValueCents,
  });

  const disclosure = buildPublicSustainabilityDisclosureV1({
    generatedAt: input.generatedAt,
    milestoneDays: input.milestoneDays,
    mitigatedSustainabilityAleCents: input.mitigatedSustainabilityAleCents,
    totalKwhSaved: input.totalKwhSaved,
    averageGridIntensityGco2PerKwh: input.averageGridIntensityGco2PerKwh,
    gridIntensityDeltaGco2PerKwh: input.gridIntensityDeltaGco2PerKwh,
    constitutionalTasSha256: input.constitutionalTasSha256,
    pdfArtifactSha256: input.pdfArtifactSha256,
    wormGsUri: input.wormGsUri,
    compositeInternalSha256: input.compositeInternalSha256,
    maturityScore,
    activeStreakDays,
    carbonRoi: {
      carbonRoiCentsPerTon: roi.carbonRoiCentsPerTon,
      avoidedMetricTons: roi.avoidedCarbonMetricTons,
      roiArtifactSha256: roi.gavel.roiArtifactSha256,
      throttleEvidenceSha256: roi.gavel.throttleEvidenceSha256,
      evidenceBindingOk: roi.gavel.evidenceBindingOk,
    },
    societal: {
      societalValueCents: roi.societalValueCents,
      impactStatement: ironethicStatement,
    },
  });

  const origin = getPublicAppOrigin();
  const token = signInvestorReportDownloadTokenWithTtl(input.relativePath, publicPdfLinkTtlMs());
  const pdfDownloadUrl = buildPdfDownloadUrl(origin, token);
  const truthBadgeUrl = buildTruthBadgeUrl(origin);
  const carbonResilienceBadgeUrl = buildCarbonResilienceBadgeUrl(origin);

  const bundle: TransparencyPublicBundleV1 = {
    schema: "ironframe.transparency_public_bundle.v1",
    generatedAt: input.generatedAt,
    disclosure,
    pdfDownloadUrl,
    truthBadgeUrl,
    carbonResilienceBadgeUrl,
  };

  writeBundle(bundle);

  const webhookResult = await pushTransparencyBundleToCms(bundle);
  const bundleWithWebhook: TransparencyPublicBundleV1 = {
    ...bundle,
    cmsWebhookLastAttempt: {
      at: new Date().toISOString(),
      ok: webhookResult.ok,
      httpStatus: webhookResult.httpStatus,
      error: webhookResult.error,
    },
  };
  writeBundle(bundleWithWebhook);

  return {
    bundle: bundleWithWebhook,
    webhook: {
      ok: webhookResult.ok,
      skipped: webhookResult.skipped,
      error: webhookResult.error,
    },
  };
}
