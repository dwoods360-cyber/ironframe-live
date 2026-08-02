/**
 * Starter MSSP / managed-security accounts from free public directories.
 * Not a live Clutch scrape — curated seeds for operator import into prospect-pool.
 * Operator must still pass Fit · Pain · Buyer · no proprietary GRC before Promote.
 */
export type MsspDirectorySeed = {
  companyName: string;
  websiteUrl: string;
  /** Public directory attribution (human research, not scraped LinkedIn). */
  directorySource: "clutch_public" | "msspproviders_public" | "google_public" | "manual_paste";
  detectedTrigger?: string;
  notes?: string;
};

export type DirectoryImportRow = {
  companyName: string;
  websiteUrl?: string | null;
  accountDomain?: string | null;
  detectedTrigger?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  directorySource?: MsspDirectorySeed["directorySource"] | "manual_paste";
  notes?: string | null;
};

const URL_IN_LINE =
  /https?:\/\/[^\s,|;]+|(?:www\.)[a-z0-9][-a-z0-9.]*\.[a-z]{2,}(?:\/[^\s,|;]*)?/i;

function stripLineNoise(line: string): string {
  return line
    .replace(/^\uFEFF/, "")
    .replace(/^[\s]*[-*•●◦]+\s+/, "")
    .replace(/^[\s]*\d+[.)]\s+/, "")
    .trim();
}

function normalizeWebsiteCandidate(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim().replace(/[)>\].,;]+$/g, "");
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(www\.)?[a-z0-9][-a-z0-9.]*\.[a-z]{2,}/i.test(value)) {
    return `https://${value.replace(/^\/\//, "")}`;
  }
  return null;
}

function parsePasteLine(line: string): DirectoryImportRow | null {
  const trimmed = stripLineNoise(line);
  if (!trimmed) return null;
  // Full-line comments only (do not drop firms like "#1 Cyber")
  if (/^#\s/.test(trimmed) || trimmed === "#") return null;

  const urlMatch = trimmed.match(URL_IN_LINE);
  const websiteFromInline = normalizeWebsiteCandidate(urlMatch?.[0] ?? null);

  let companyName = "";
  let websiteUrl: string | null = null;
  let detectedTrigger: string | null = null;

  if (trimmed.includes("\t") || trimmed.includes("|") || trimmed.includes(";")) {
    const parts = trimmed.includes("\t")
      ? trimmed.split("\t")
      : trimmed.includes("|")
        ? trimmed.split("|")
        : trimmed.split(";");
    companyName = stripLineNoise(parts[0] ?? "");
    websiteUrl =
      normalizeWebsiteCandidate(parts[1] ?? null) ??
      websiteFromInline ??
      null;
    detectedTrigger = (parts[2] ?? "").trim() || null;
  } else if (trimmed.includes(",") && /https?:\/\//i.test(trimmed)) {
    // CSV with URL — split on first comma before http, or classic 3-part CSV
    const parts = trimmed.split(",").map((p) => p.trim());
    const urlIdx = parts.findIndex((p) => normalizeWebsiteCandidate(p));
    if (urlIdx > 0) {
      companyName = parts.slice(0, urlIdx).join(", ").trim();
      websiteUrl = normalizeWebsiteCandidate(parts[urlIdx] ?? null);
      detectedTrigger = parts[urlIdx + 1]?.trim() || null;
    } else {
      companyName = parts[0] ?? "";
      websiteUrl = normalizeWebsiteCandidate(parts[1] ?? null) ?? websiteFromInline;
      detectedTrigger = (parts[2] ?? "").trim() || null;
    }
  } else if (websiteFromInline) {
    companyName = stripLineNoise(trimmed.replace(URL_IN_LINE, "")).replace(/[,\-|]+$/g, "").trim();
    websiteUrl = websiteFromInline;
  } else {
    // Company-only line (MSSPProviders name lists) — research may probe a website later
    companyName = trimmed;
    websiteUrl = null;
  }

  if (!companyName || companyName.length < 2) {
    // URL-only line → derive a temporary company label from host
    if (websiteUrl) {
      try {
        const host = new URL(websiteUrl).hostname.replace(/^www\./i, "");
        companyName = host.split(".")[0] || host;
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }

  return {
    companyName: companyName.slice(0, 200),
    websiteUrl,
    detectedTrigger,
    directorySource: "manual_paste",
  };
}

/** Parse operator paste: company [, website] [, trigger] — CSV / TSV / pipe / company-only. */
export function parseDirectoryImportPaste(raw: string): DirectoryImportRow[] {
  const text = (raw ?? "").replace(/^\uFEFF/, "");
  const lines = text.split(/\r\n|\n|\r|\u2028|\u2029/);
  const rows: DirectoryImportRow[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const row = parsePasteLine(line);
    if (!row) continue;
    const key = row.companyName.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }
  return rows;
}

export function listMsspFreeDirectorySeeds(): MsspDirectorySeed[] {
  return [...MSSP_FREE_DIRECTORY_SEEDS];
}

/** Exclude HOLD / channel-competitors — never seed these. */
export const MSSP_FREE_DIRECTORY_SEEDS: readonly MsspDirectorySeed[] = [
  {
    companyName: "CyberDuo",
    websiteUrl: "https://www.cyberduo.com",
    directorySource: "clutch_public",
    detectedTrigger: "COMPLIANCE_JOB_POST",
    notes: "Clutch cybersecurity listing — managed security; confirm vCISO/GRC practice before Promote.",
  },
  {
    companyName: "NopalCyber",
    websiteUrl: "https://nopalcyber.com",
    directorySource: "clutch_public",
    detectedTrigger: "COMPLIANCE_JOB_POST",
    notes: "Clutch listing — MXDR / managed security; confirm multi-client GRC motion.",
  },
  {
    companyName: "Packetlabs",
    websiteUrl: "https://www.packetlabs.com",
    directorySource: "clutch_public",
    detectedTrigger: "COMPLIANCE_JOB_POST",
    notes: "Clutch listing — assessments-heavy; Fit only if managed GRC/vCISO practice exists.",
  },
  {
    companyName: "Foresite Cybersecurity",
    websiteUrl: "https://foresite.com",
    directorySource: "clutch_public",
    detectedTrigger: "COMPLIANCE_JOB_POST",
    notes: "Clutch / public MSSP — may be large; confirm emp band + practice type on site.",
  },
  {
    companyName: "XRAY CyberSecurity",
    websiteUrl: "https://xraycybersecurity.com",
    directorySource: "clutch_public",
    detectedTrigger: "COMPLIANCE_JOB_POST",
    notes: "Clutch listing — boutique cyber; confirm managed GRC / multi-client delivery.",
  },
] as const;
