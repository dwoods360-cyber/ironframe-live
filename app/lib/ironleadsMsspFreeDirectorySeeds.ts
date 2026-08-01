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

function parsePasteLine(line: string): DirectoryImportRow | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const parts = trimmed.includes("\t")
    ? trimmed.split("\t")
    : trimmed.includes("|")
      ? trimmed.split("|")
      : trimmed.split(",");
  const companyName = (parts[0] ?? "").trim();
  const websiteUrl = (parts[1] ?? "").trim() || null;
  const detectedTrigger = (parts[2] ?? "").trim() || null;
  if (!companyName) return null;
  return {
    companyName,
    websiteUrl,
    detectedTrigger,
    directorySource: "manual_paste",
  };
}

/** Parse operator paste: company, website, optional trigger (CSV / TSV / pipe). */
export function parseDirectoryImportPaste(raw: string): DirectoryImportRow[] {
  return raw
    .split(/\r?\n/)
    .map(parsePasteLine)
    .filter((row): row is DirectoryImportRow => Boolean(row));
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
