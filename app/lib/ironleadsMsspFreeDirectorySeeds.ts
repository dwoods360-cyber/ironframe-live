/**
 * Starter MSSP / managed-security accounts from free public directories.
 * Not a live Clutch scrape — curated seeds for operator import into prospect-pool.
 * Operator must still pass Fit · Pain · Buyer · no proprietary GRC before Promote.
 */

import { isDirectoryPasteNoise } from "@/app/lib/ironleadsDirectoryPasteNoise";
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

  if (isDirectoryPasteNoise(companyName)) return null;

  return {
    companyName: companyName.slice(0, 200),
    websiteUrl,
    detectedTrigger,
    directorySource: "manual_paste",
  };
}

const BLOCK_SEPARATOR_RE = /^={3,}\s*$/;

function pushUniqueRow(
  rows: DirectoryImportRow[],
  seen: Set<string>,
  row: DirectoryImportRow,
): void {
  const key = row.companyName.trim().toLowerCase();
  if (!key || seen.has(key)) return;
  seen.add(key);
  rows.push(row);
}

/**
 * MSSPProviders card paste: each entity sits between ========= lines.
 * First non-noise line in the block is the company; chips/blurbs/locations are ignored.
 */
function parseDirectoryCardBlocks(text: string): DirectoryImportRow[] | null {
  const lines = text.split(/\r\n|\n|\r|\u2028|\u2029/);
  const separatorCount = lines.filter((l) => BLOCK_SEPARATOR_RE.test(l.trim())).length;
  if (separatorCount < 2) return null;

  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (BLOCK_SEPARATOR_RE.test(line.trim())) {
      if (current.some((l) => l.trim())) blocks.push(current);
      current = [];
      continue;
    }
    current.push(line);
  }
  if (current.some((l) => l.trim())) blocks.push(current);

  const rows: DirectoryImportRow[] = [];
  const seen = new Set<string>();
  for (const block of blocks) {
    let companyRow: DirectoryImportRow | null = null;
    let websiteUrl: string | null = null;
    const noteBits: string[] = [];

    for (const line of block) {
      const trimmed = stripLineNoise(line);
      if (!trimmed) continue;
      const urlMatch = trimmed.match(URL_IN_LINE);
      if (urlMatch) {
        websiteUrl = normalizeWebsiteCandidate(urlMatch[0]) ?? websiteUrl;
      }
      if (isDirectoryPasteNoise(trimmed)) {
        if (/^best for:/i.test(trimmed) || /^serves:/i.test(trimmed)) {
          noteBits.push(trimmed.slice(0, 160));
        }
        continue;
      }
      if (!companyRow) {
        companyRow = parsePasteLine(trimmed);
      }
    }

    if (!companyRow) continue;
    if (websiteUrl && !companyRow.websiteUrl) companyRow.websiteUrl = websiteUrl;
    if (noteBits.length) {
      companyRow.notes = noteBits.slice(0, 3).join(" | ");
      companyRow.directorySource = "msspproviders_public";
    }
    pushUniqueRow(rows, seen, companyRow);
  }
  return rows;
}

/** Parse operator paste: card blocks, or company [, website] [, trigger] line lists. */
export function parseDirectoryImportPaste(raw: string): DirectoryImportRow[] {
  const text = (raw ?? "").replace(/^\uFEFF/, "");
  const fromBlocks = parseDirectoryCardBlocks(text);
  if (fromBlocks && fromBlocks.length > 0) return fromBlocks;

  const lines = text.split(/\r\n|\n|\r|\u2028|\u2029/);
  const rows: DirectoryImportRow[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const row = parsePasteLine(line);
    if (!row) continue;
    pushUniqueRow(rows, seen, row);
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
