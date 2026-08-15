/**
 * Path B Sales Approvals geo ranking — US-first cold DISPATCH.
 * Client-safe (no server-only). Heuristic from email/domain/country/company.
 */

export type SalesOutreachGeoBand = "US_PREFERRED" | "US" | "UNKNOWN" | "NON_US";

export type ApprovalGeoFilter = "US" | "ALL";

const NON_US_TLD =
  /\.(ca|uk|co\.uk|au|nz|de|fr|nl|be|ch|at|ie|it|es|pt|se|no|dk|fi|pl|cz|ro|hu|gr|tr|za|in|np|pk|bd|lk|sg|my|id|ph|th|vn|jp|kr|cn|hk|tw|mx|br|ar|cl|co|pe|ec|uy|cr|pa|gt|ru|ua|il|ae|sa|ng|ke|gh|eg)(\.|$)/i;

const US_PREFERRED_STATE =
  /\b(AL|AR|CT|DC|DE|FL|GA|IA|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|NC|ND|NE|NH|NJ|NY|OH|OK|PA|RI|SC|SD|TN|TX|VA|VT|WI|WV)\b/;

const NON_US_COUNTRY =
  /\b(canada|united\s+kingdom|england|scotland|wales|ireland|australia|new\s+zealand|germany|france|netherlands|belgium|switzerland|austria|spain|italy|portugal|sweden|norway|denmark|finland|poland|brazil|brasil|mexico|colombia|argentina|chile|peru|ecuador|india|nepal|pakistan|singapore|japan|china|hong\s+kong|south\s+africa|nigeria)\b/i;

const US_COUNTRY = /\b(united\s+states|u\.?s\.?a\.?|usa)\b/i;

const NON_US_COMPANY_HINT =
  /\b(colombia|brasil|brazil|nepal|ecuador|south\s+africa|canada|netherlands|france|germany|uk\b|u\.k\.)\b/i;

function hostFromEmailOrDomain(raw: string | null | undefined): string | null {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    ?.trim();
  if (!s) return null;
  if (s.includes("@")) {
    const host = s.split("@")[1]?.trim();
    return host || null;
  }
  return s.includes(".") ? s : null;
}

export function parseApprovalGeoFilter(
  raw: string | null | undefined,
  kindHint?: string | null,
): ApprovalGeoFilter {
  const value = (raw ?? "").trim().toUpperCase();
  if (value === "ALL" || value === "ANY") return "ALL";
  if (value === "US" || value === "USA") return "US";
  // Default SALES track to US-only Path B cold wave.
  const kind = (kindHint ?? "").trim().toUpperCase();
  if (kind === "SALES" && !raw) return "US";
  return "ALL";
}

export function inferSalesOutreachGeo(input: {
  email?: string | null;
  company?: string | null;
  accountDomain?: string | null;
  country?: string | null;
  location?: string | null;
}): { band: SalesOutreachGeoBand; rank: number; label: string } {
  const company = String(input.company || "");
  const country = String(input.country || "");
  const location = String(input.location || "");
  const hay = `${company}\n${country}\n${location}`;
  const host =
    hostFromEmailOrDomain(input.email) || hostFromEmailOrDomain(input.accountDomain);

  if (NON_US_COUNTRY.test(hay) || NON_US_COMPANY_HINT.test(company)) {
    return { band: "NON_US", rank: 3, label: "Non-US" };
  }
  if (host && NON_US_TLD.test(host)) {
    return { band: "NON_US", rank: 3, label: "Non-US" };
  }

  if (US_COUNTRY.test(hay) || US_PREFERRED_STATE.test(location)) {
    const preferred = US_PREFERRED_STATE.test(location);
    return preferred
      ? { band: "US_PREFERRED", rank: 0, label: "US · ET/CT" }
      : { band: "US", rank: 1, label: "US" };
  }

  // Generic commercial TLDs without foreign signal — treat as US-unknown for Path B wave.
  if (host && /\.(com|net|org|io|ai|co|us)(\.|$)/i.test(host) && !NON_US_TLD.test(host)) {
    if (/\.us(\.|$)/i.test(host)) {
      return { band: "US", rank: 1, label: "US" };
    }
    return { band: "UNKNOWN", rank: 2, label: "Geo unknown" };
  }

  if (!host && !country && !location) {
    return { band: "UNKNOWN", rank: 2, label: "Geo unknown" };
  }

  return { band: "UNKNOWN", rank: 2, label: "Geo unknown" };
}

export function isUsSalesOutreachBand(band: SalesOutreachGeoBand): boolean {
  return band === "US_PREFERRED" || band === "US" || band === "UNKNOWN";
}

export function compareSalesOutreachGeo(
  a: { band: SalesOutreachGeoBand; rank: number },
  b: { band: SalesOutreachGeoBand; rank: number },
): number {
  return a.rank - b.rank;
}
