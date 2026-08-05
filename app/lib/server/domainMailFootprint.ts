import "server-only";

import dns from "node:dns/promises";

import { normalizeAccountDomain } from "@/app/lib/ingress/ironleadsSuspectIdentity";

/**
 * Public DNS mail footprint for a company domain.
 * MX / SPF / DMARC only — no SMTP VRFY/RCPT, no relay probes, no ownership proof.
 * Use as a Promote decision aid next to Ironleads pattern-guess hygiene.
 */

export type MailProviderGuess =
  | "microsoft365"
  | "google"
  | "proofpoint"
  | "mimecast"
  | "barracuda"
  | "other_gateway"
  | "other"
  | "unknown";

export type CatchAllRisk = "low" | "elevated" | "high" | "unknown";

export type DomainMailFootprint = {
  domain: string;
  checkedAt: string;
  mxOk: boolean | null;
  mxHosts: string[];
  mxError: string | null;
  spfPresent: boolean;
  spfRecord: string | null;
  dmarcPresent: boolean;
  dmarcRecord: string | null;
  dmarcPolicy: string | null;
  provider: MailProviderGuess;
  providerLabel: string;
  catchAllRisk: CatchAllRisk;
  catchAllLabel: string;
  operatorNote: string;
};

const FOOTPRINT_CACHE = new Map<
  string,
  { at: number; value: DomainMailFootprint }
>();
const CACHE_TTL_MS = 15 * 60 * 1000;

const PROVIDER_LABEL: Record<MailProviderGuess, string> = {
  microsoft365: "Microsoft 365",
  google: "Google Workspace",
  proofpoint: "Proofpoint (gateway)",
  mimecast: "Mimecast (gateway)",
  barracuda: "Barracuda (gateway)",
  other_gateway: "Mail gateway / filter",
  other: "Other / self-hosted",
  unknown: "Unknown",
};

const CATCH_ALL_LABEL: Record<CatchAllRisk, string> = {
  low: "Lower catch-all risk (still not ownership proof)",
  elevated: "Elevated catch-all / gateway risk — MX PASS ≠ ownership",
  high: "High catch-all / gateway risk — do not Promote on pattern_guess alone",
  unknown: "Catch-all risk unknown",
};

/** Pure heuristic — unit-test without DNS. */
export function classifyMailProvider(mxHosts: readonly string[]): MailProviderGuess {
  const blob = mxHosts.map((h) => h.toLowerCase()).join(" ");
  if (!blob) return "unknown";
  if (
    /\.mail\.protection\.outlook\.com\b/.test(blob) ||
    /\.protection\.outlook\.com\b/.test(blob) ||
    /\.olc\.protection\.outlook\.com\b/.test(blob)
  ) {
    return "microsoft365";
  }
  if (/\.google\.com\b/.test(blob) || /\.googlemail\.com\b/.test(blob) || /\baspmx\b/.test(blob)) {
    return "google";
  }
  if (/proofpoint\.com\b|pphosted\.com\b|ppe-hosted\.com\b/.test(blob)) return "proofpoint";
  if (/mimecast\.com\b/.test(blob)) return "mimecast";
  if (/barracuda\.com\b|barracudanetworks\.com\b/.test(blob)) return "barracuda";
  if (
    /messagelabs\.com\b|trendmicro\.com\b|fireeye\.com\b|iphmx\.com\b|securence\.com\b|spamhero\.|mailcontrol\.com\b/.test(
      blob,
    )
  ) {
    return "other_gateway";
  }
  return "other";
}

/** Pure heuristic — unit-test without DNS. */
export function assessCatchAllRisk(provider: MailProviderGuess): CatchAllRisk {
  switch (provider) {
    case "proofpoint":
    case "mimecast":
    case "barracuda":
    case "other_gateway":
      return "high";
    case "microsoft365":
    case "google":
      // Many SMB tenants are not catch-all; still not ownership proof.
      return "elevated";
    case "other":
      return "elevated";
    default:
      return "unknown";
  }
}

export function parseDmarcPolicy(record: string | null): string | null {
  if (!record) return null;
  const m = record.match(/\bp=([a-z]+)\b/i);
  return m?.[1]?.toLowerCase() ?? null;
}

function buildOperatorNote(input: {
  mxOk: boolean | null;
  provider: MailProviderGuess;
  catchAllRisk: CatchAllRisk;
  spfPresent: boolean;
  dmarcPresent: boolean;
}): string {
  if (input.mxOk === false) {
    return "No MX records — domain is unlikely to receive mail. Do not pattern-guess emails here.";
  }
  if (input.mxOk === null) {
    return "MX lookup failed — footprint incomplete; retry later.";
  }
  const parts = [
    `Stack looks like ${PROVIDER_LABEL[input.provider]}.`,
    CATCH_ALL_LABEL[input.catchAllRisk] + ".",
    "Public DNS only — not mailbox ownership.",
  ];
  if (!input.spfPresent) parts.push("SPF TXT missing.");
  if (!input.dmarcPresent) parts.push("DMARC missing.");
  return parts.join(" ");
}

async function lookupMx(domain: string): Promise<{ hosts: string[]; error: string | null }> {
  try {
    const records = await dns.resolveMx(domain);
    const hosts = [...records]
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.exchange.replace(/\.$/, ""))
      .filter(Boolean);
    return { hosts, error: null };
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : "";
    if (code === "ENODATA" || code === "ENOTFOUND" || code === "ENAME_NOT_FOUND") {
      return { hosts: [], error: null };
    }
    return {
      hosts: [],
      error: err instanceof Error ? err.message : "DNS MX lookup failed",
    };
  }
}

async function lookupTxt(name: string): Promise<string[]> {
  try {
    const chunks = await dns.resolveTxt(name);
    return chunks.map((parts) => parts.join(""));
  } catch {
    return [];
  }
}

export function clearDomainMailFootprintCache(): void {
  FOOTPRINT_CACHE.clear();
}

export async function buildDomainMailFootprint(
  rawDomain: string | null | undefined,
): Promise<DomainMailFootprint | null> {
  const domain = normalizeAccountDomain(rawDomain);
  if (!domain) return null;

  const cached = FOOTPRINT_CACHE.get(domain);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }

  const checkedAt = new Date().toISOString();
  const { hosts, error } = await lookupMx(domain);
  const mxOk = error ? null : hosts.length > 0;
  const mxHosts = hosts.slice(0, 8);

  const txt = await lookupTxt(domain);
  const spfRecord =
    txt.find((r) => /^v=spf1\b/i.test(r.trim()))?.trim() ?? null;
  const dmarcRecords = await lookupTxt(`_dmarc.${domain}`);
  const dmarcRecord =
    dmarcRecords.find((r) => /v=dmarc1/i.test(r))?.trim() ?? null;
  const dmarcPolicy = parseDmarcPolicy(dmarcRecord);

  const provider = classifyMailProvider(mxHosts);
  const catchAllRisk = mxOk === false ? "unknown" : assessCatchAllRisk(provider);

  const value: DomainMailFootprint = {
    domain,
    checkedAt,
    mxOk,
    mxHosts,
    mxError: error,
    spfPresent: Boolean(spfRecord),
    spfRecord: spfRecord ? spfRecord.slice(0, 280) : null,
    dmarcPresent: Boolean(dmarcRecord),
    dmarcRecord: dmarcRecord ? dmarcRecord.slice(0, 280) : null,
    dmarcPolicy,
    provider,
    providerLabel: PROVIDER_LABEL[provider],
    catchAllRisk,
    catchAllLabel: CATCH_ALL_LABEL[catchAllRisk],
    operatorNote: buildOperatorNote({
      mxOk,
      provider,
      catchAllRisk,
      spfPresent: Boolean(spfRecord),
      dmarcPresent: Boolean(dmarcRecord),
    }),
  };

  FOOTPRINT_CACHE.set(domain, { at: Date.now(), value });
  return value;
}

/** Prefer deal domain, then website host, then real contact email domain. */
export function resolveFootprintDomain(input: {
  accountDomain?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
}): string | null {
  const fromDeal = normalizeAccountDomain(input.accountDomain);
  if (fromDeal) return fromDeal;
  const fromWeb = normalizeAccountDomain(input.websiteUrl);
  if (fromWeb) return fromWeb;
  const email = (input.contactEmail ?? "").trim().toLowerCase();
  if (email && !/@ironleads\.local$/i.test(email) && email.includes("@")) {
    return normalizeAccountDomain(email.split("@")[1] ?? "");
  }
  return null;
}
