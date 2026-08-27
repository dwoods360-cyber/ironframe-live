import "server-only";

import { isApolloConfigured } from "@/app/lib/server/apolloEnrichmentClient";
import { enrichIronleadsSuspectWithApollo } from "@/app/lib/server/ironleadsApolloEnrichCore";
import { enrichIronleadsSuspectWithHunter } from "@/app/lib/server/ironleadsHunterEnrichCore";
import { enrichIronleadsSuspectWithProspeo } from "@/app/lib/server/ironleadsProspeoEnrichCore";
import { isHunterConfigured } from "@/app/lib/server/hunterEnrichmentClient";
import { isProspeoConfigured } from "@/app/lib/server/prospeoEnrichmentClient";
import { isSalesDispatchHoldCompany } from "@/app/lib/approvalDispatchValidation";
import prisma from "@/lib/prisma";

/** Prospect-pool tenant used by Ironleads Path B SUSPECT queue. */
const PROSPECT_POOL_TENANT_ID =
  process.env.IRONFRAME_PROSPECT_POOL_TENANT_UUID?.trim() ||
  "11111111-1111-4111-8111-111111111111";

const DEFAULT_LIMIT = 8;
const DEFAULT_GAP_MS = 1_200;

export type AutoEnrichProvider = "prospeo" | "apollo" | "hunter";

export type AutoEnrichContactResult = {
  contactId: string;
  company: string | null;
  providers: Array<{
    provider: AutoEnrichProvider;
    ok: boolean;
    error?: string;
    appliedEmail?: boolean;
  }>;
};

export type AutoEnrichBatchResult = {
  enabled: boolean;
  skippedReason?: string;
  dryRun: boolean;
  limit: number;
  selected: number;
  results: AutoEnrichContactResult[];
  providersEnabled: {
    prospeo: boolean;
    apollo: boolean;
    hunter: boolean;
  };
};

function asRec(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return defaultValue;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return defaultValue;
}

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]?.trim());
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function isPlaceholderEmail(email: string | null | undefined): boolean {
  const e = String(email || "").trim().toLowerCase();
  return !e || /@ironleads\.local$/i.test(e);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Operator-authorized SUSPECT email enrichment batch.
 * Fills placeholders only (provider cores already refuse overwrite of verified seats).
 * NEVER promotes to PROSPECT and NEVER DISPATCHes — Approvals HITL remains the send gate.
 */
export async function runIronleadsAutoEnrichBatch(options?: {
  dryRun?: boolean;
  limit?: number;
}): Promise<AutoEnrichBatchResult> {
  const enabled = envFlag("IRONLEADS_AUTO_ENRICH_ENABLED", false);
  const dryRun = Boolean(options?.dryRun) || envFlag("IRONLEADS_AUTO_ENRICH_DRY_RUN", false);
  const limit = Math.min(40, options?.limit ?? envInt("IRONLEADS_AUTO_ENRICH_LIMIT", DEFAULT_LIMIT));
  const gapMs = envInt("IRONLEADS_AUTO_ENRICH_GAP_MS", DEFAULT_GAP_MS);

  const prospeoOn = isProspeoConfigured() && envFlag("IRONLEADS_AUTO_ENRICH_PROSPEO", true);
  const apolloOn = isApolloConfigured() && envFlag("IRONLEADS_AUTO_ENRICH_APOLLO", true);
  // Hunter Free plan burns fast — default OFF until credits restored.
  const hunterOn = isHunterConfigured() && envFlag("IRONLEADS_AUTO_ENRICH_HUNTER", false);

  const providersEnabled = { prospeo: prospeoOn, apollo: apolloOn, hunter: hunterOn };

  if (!enabled) {
    return {
      enabled: false,
      skippedReason: "IRONLEADS_AUTO_ENRICH_ENABLED is off",
      dryRun,
      limit,
      selected: 0,
      results: [],
      providersEnabled,
    };
  }

  if (!prospeoOn && !apolloOn && !hunterOn) {
    return {
      enabled: true,
      skippedReason: "No enrich providers enabled/configured",
      dryRun,
      limit,
      selected: 0,
      results: [],
      providersEnabled,
    };
  }

  const suspects = await prisma.ironboardCrmContact.findMany({
    where: {
      tenantId: PROSPECT_POOL_TENANT_ID,
      primaryDeals: { some: { stage: "SUSPECT" } },
    },
    select: {
      id: true,
      company: true,
      email: true,
      fullName: true,
      metadata: true,
      updatedAt: true,
    },
    take: 2_000,
  });

  type Ranked = {
    id: string;
    company: string | null;
    score: number;
  };

  const ranked: Ranked[] = [];
  for (const c of suspects) {
    if (isSalesDispatchHoldCompany(c.company)) continue;
    if (!isPlaceholderEmail(c.email)) continue;

    const meta = asRec(c.metadata);
    const oh = asRec(meta.operatorHold);
    const classif = String(oh.classification || "").toLowerCase();
    if (classif === "channel_competitor" || classif === "pending_batch") continue;

    const brief = asRec(meta.accountResearchBrief);
    const gates = asRec(brief.gates);
    const fit = String(asRec(gates.fit).result || "").toUpperCase();
    const named = asRec(meta.namedBuyer);
    const hasNamed =
      (typeof named.fullName === "string" && named.fullName.trim().length > 1) ||
      (typeof c.fullName === "string" &&
        c.fullName.trim().length > 1 &&
        !/@ironleads\.local/i.test(c.email || ""));

    // Prefer Fit PASS + named buyer; then enrich_later; skip Fit FAIL.
    if (fit === "FAIL") continue;

    let score = 0;
    if (fit === "PASS") score += 100;
    if (fit === "ADJACENT") score += 40;
    if (hasNamed) score += 50;
    if (classif === "enrich_later") score += 20;
    if (!classif) score += 10;
    // Avoid thrashing recently touched rows.
    const ageHrs = (Date.now() - c.updatedAt.getTime()) / 3_600_000;
    if (ageHrs < 6) score -= 30;

    ranked.push({ id: c.id, company: c.company, score });
  }

  ranked.sort((a, b) => b.score - a.score);
  const selected = ranked.slice(0, limit);

  const results: AutoEnrichContactResult[] = [];
  for (const row of selected) {
    const entry: AutoEnrichContactResult = {
      contactId: row.id,
      company: row.company,
      providers: [],
    };

    if (dryRun) {
      if (prospeoOn) entry.providers.push({ provider: "prospeo", ok: true });
      if (apolloOn) entry.providers.push({ provider: "apollo", ok: true });
      if (hunterOn) entry.providers.push({ provider: "hunter", ok: true });
      results.push(entry);
      continue;
    }

    if (prospeoOn) {
      const r = await enrichIronleadsSuspectWithProspeo(row.id, { applyContactFields: true });
      entry.providers.push({
        provider: "prospeo",
        ok: r.ok,
        error: r.ok ? undefined : r.error,
        appliedEmail: r.ok ? Boolean(r.prospeo?.appliedEmail) : undefined,
      });
      await sleep(gapMs);
    }

    // Refresh email — skip later finders if Prospeo already cleared placeholder.
    const afterProspeo = await prisma.ironboardCrmContact.findUnique({
      where: { id: row.id },
      select: { email: true },
    });
    const stillPlaceholder = isPlaceholderEmail(afterProspeo?.email);

    if (apolloOn && stillPlaceholder) {
      const r = await enrichIronleadsSuspectWithApollo(row.id, { applyContactFields: true });
      entry.providers.push({
        provider: "apollo",
        ok: r.ok,
        error: r.ok ? undefined : r.error,
        appliedEmail: r.ok ? Boolean(r.apollo?.appliedEmail) : undefined,
      });
      await sleep(gapMs);
    }

    const afterApollo = stillPlaceholder
      ? await prisma.ironboardCrmContact.findUnique({
          where: { id: row.id },
          select: { email: true },
        })
      : afterProspeo;
    const stillNeedsHunter = isPlaceholderEmail(afterApollo?.email);

    if (hunterOn && stillNeedsHunter) {
      const r = await enrichIronleadsSuspectWithHunter(row.id, { applyContactFields: true });
      entry.providers.push({
        provider: "hunter",
        ok: r.ok,
        error: r.ok ? undefined : r.error,
        appliedEmail: r.ok ? Boolean(r.hunter?.appliedEmail) : undefined,
      });
      await sleep(gapMs);
    }

    results.push(entry);
  }

  return {
    enabled: true,
    dryRun,
    limit,
    selected: selected.length,
    results,
    providersEnabled,
  };
}
