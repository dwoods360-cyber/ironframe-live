import "server-only";

import { isApolloConfigured } from "@/app/lib/server/apolloEnrichmentClient";
import { enrichIronleadsSuspectWithApollo } from "@/app/lib/server/ironleadsApolloEnrichCore";
import { enrichIronleadsSuspectWithHunter } from "@/app/lib/server/ironleadsHunterEnrichCore";
import { enrichIronleadsSuspectWithProspeo } from "@/app/lib/server/ironleadsProspeoEnrichCore";
import { isHunterConfigured } from "@/app/lib/server/hunterEnrichmentClient";
import { isProspeoConfigured } from "@/app/lib/server/prospeoEnrichmentClient";
import { isSalesDispatchHoldCompany } from "@/app/lib/approvalDispatchValidation";
import {
  isHarvestPlaceholderEmail,
  shouldAutoEnrichPlaceholder,
} from "@/app/lib/ironleadsPreOutreachPolicy";
import { withProspectPoolTenant } from "@/app/lib/server/ironleadsTenantScope";

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

export function isIronleadsAutoEnrichEnabled(): boolean {
  return envFlag("IRONLEADS_AUTO_ENRICH_ENABLED", true);
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function providersFromEnv(options?: { includeHunter?: boolean }): {
  prospeo: boolean;
  apollo: boolean;
  hunter: boolean;
} {
  return {
    prospeo: isProspeoConfigured() && envFlag("IRONLEADS_AUTO_ENRICH_PROSPEO", true),
    apollo: isApolloConfigured() && envFlag("IRONLEADS_AUTO_ENRICH_APOLLO", true),
    hunter:
      isHunterConfigured() &&
      envFlag(
        "IRONLEADS_AUTO_ENRICH_HUNTER",
        options?.includeHunter === true,
      ),
  };
}

/**
 * Prospeo → Apollo → Hunter on one placeholder SUSPECT.
 * Never overwrites a real inbox. Never DISPATCHes.
 */
export async function enrichIronleadsSuspectIfPlaceholder(
  contactId: string,
  options?: { includeHunter?: boolean; gapMs?: number },
): Promise<AutoEnrichContactResult> {
  const gapMs = options?.gapMs ?? envInt("IRONLEADS_AUTO_ENRICH_GAP_MS", DEFAULT_GAP_MS);
  const on = providersFromEnv({ includeHunter: options?.includeHunter });
  const entry: AutoEnrichContactResult = {
    contactId,
    company: null,
    providers: [],
  };

  const row = await withProspectPoolTenant((tx, tenantId) =>
    tx.ironboardCrmContact.findFirst({
      where: { id: contactId, tenantId },
      select: { id: true, company: true, email: true, fullName: true, metadata: true },
    }),
  );
  if (!row) {
    entry.providers.push({ provider: "prospeo", ok: false, error: "Contact not found" });
    return entry;
  }
  entry.company = row.company;

  const meta = asRec(row.metadata);
  const named = asRec(meta.namedBuyer);
  const brief = asRec(meta.accountResearchBrief);
  const gates = asRec(brief.gates);
  const hold = asRec(meta.operatorHold);
  if (
    !shouldAutoEnrichPlaceholder({
      email: row.email,
      namedBuyerName:
        (typeof named.fullName === "string" && named.fullName) || row.fullName,
      fit: String(asRec(gates.fit).result || ""),
      holdClassification: String(hold.classification || ""),
      company: row.company,
    })
  ) {
    return entry;
  }

  if (on.prospeo) {
    const r = await enrichIronleadsSuspectWithProspeo(row.id, { applyContactFields: true });
    entry.providers.push({
      provider: "prospeo",
      ok: r.ok,
      error: r.ok ? undefined : r.error,
      appliedEmail: r.ok ? Boolean(r.prospeo?.appliedEmail) : undefined,
    });
    await sleep(gapMs);
  }

  const afterProspeo = await withProspectPoolTenant((tx, tenantId) =>
    tx.ironboardCrmContact.findFirst({
      where: { id: row.id, tenantId },
      select: { email: true },
    }),
  );
  let stillPlaceholder = isHarvestPlaceholderEmail(afterProspeo?.email);

  if (on.apollo && stillPlaceholder) {
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
    ? await withProspectPoolTenant((tx, tenantId) =>
        tx.ironboardCrmContact.findFirst({
          where: { id: row.id, tenantId },
          select: { email: true },
        }),
      )
    : afterProspeo;
  stillPlaceholder = isHarvestPlaceholderEmail(afterApollo?.email);

  if (on.hunter && stillPlaceholder) {
    const r = await enrichIronleadsSuspectWithHunter(row.id, { applyContactFields: true });
    entry.providers.push({
      provider: "hunter",
      ok: r.ok,
      error: r.ok ? undefined : r.error,
      appliedEmail: r.ok ? Boolean(r.hunter?.appliedEmail) : undefined,
    });
  }

  return entry;
}

/**
 * Operator-authorized SUSPECT email enrichment batch.
 * Fills placeholders only (provider cores already refuse overwrite of verified seats).
 * NEVER DISPATCHes — Approvals HITL remains the send gate.
 */
export async function runIronleadsAutoEnrichBatch(options?: {
  dryRun?: boolean;
  limit?: number;
}): Promise<AutoEnrichBatchResult> {
  const enabled = envFlag("IRONLEADS_AUTO_ENRICH_ENABLED", true);
  const dryRun = Boolean(options?.dryRun) || envFlag("IRONLEADS_AUTO_ENRICH_DRY_RUN", false);
  const limit = Math.min(40, options?.limit ?? envInt("IRONLEADS_AUTO_ENRICH_LIMIT", DEFAULT_LIMIT));
  const gapMs = envInt("IRONLEADS_AUTO_ENRICH_GAP_MS", DEFAULT_GAP_MS);
  const providersEnabled = providersFromEnv({ includeHunter: false });
  const prospeoOn = providersEnabled.prospeo;
  const apolloOn = providersEnabled.apollo;
  const hunterOn = providersEnabled.hunter;

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

  const suspects = await withProspectPoolTenant((tx, tenantId) =>
    tx.ironboardCrmContact.findMany({
    where: {
      tenantId,
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
  }),
  );

  type Ranked = {
    id: string;
    company: string | null;
    score: number;
  };

  const ranked: Ranked[] = [];
  for (const c of suspects) {
    if (isSalesDispatchHoldCompany(c.company)) continue;

    const meta = asRec(c.metadata);
    const oh = asRec(meta.operatorHold);
    const classif = String(oh.classification || "").toLowerCase();
    const brief = asRec(meta.accountResearchBrief);
    const gates = asRec(brief.gates);
    const fit = String(asRec(gates.fit).result || "").toUpperCase();
    const named = asRec(meta.namedBuyer);
    const namedName =
      (typeof named.fullName === "string" && named.fullName) || c.fullName;
    if (
      !shouldAutoEnrichPlaceholder({
        email: c.email,
        namedBuyerName: namedName,
        fit,
        holdClassification: classif,
        company: c.company,
      })
    ) {
      continue;
    }

    const hasNamed = true;

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

    results.push(
      await enrichIronleadsSuspectIfPlaceholder(row.id, { includeHunter: hunterOn, gapMs }),
    );
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
