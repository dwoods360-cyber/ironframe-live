/**
 * Detect MSSPProviders / Clutch directory page chrome pasted as "company" names.
 * Shared by paste parser (client+server) and cleanup scripts.
 */

const LOCATION_RE =
  /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|DC|UK|USA|US|Canada|Colombia|Brazil|Romania|Nepal|India|Australia|Germany|France|Mexico|Finland|Ghana|Singapore|Netherlands|Ireland|Spain|Italy|Japan|Korea|China|UAE|Dubai|Sweden|Norway|Denmark|Poland|Portugal|Switzerland|Austria|Belgium|Israel|Turkey|Pakistan|Bangladesh|Thailand|Vietnam|Philippines|Malaysia|Indonesia|Argentina|Chile|Peru|South Africa|Nigeria|Kenya|Egypt)\b/i;

const CITY_COUNTRY_RE = /^[A-Z][A-Za-z .'-]{1,40},\s*[A-Z][A-Za-z .'-]{1,40}$/;

const GENERIC_SERVICE_RE =
  /^(cloud security|firewall management|managed (soc|security|services|it)|threat (intelligence|detection)|endpoint (security|protection)|network security( monitoring)?|identity (and|&) access( management)?|compliance (services|consulting|management)|security operations|incident response|vulnerability management|penetration testing|data protection|cyber defense|email security|siem management|security awareness training)$/i;

const COUNTRY_ONLY_RE =
  /^(singapore|united states|canada|india|brazil|mexico|germany|france|australia|uk|usa)$/i;

/** @returns noise reason, or null if the line looks like a real firm name */
export function directoryPasteNoiseReason(company: string): string | null {
  const c = String(company ?? "").trim();
  if (!c) return "empty";
  if (/^=+$/.test(c)) return "separator";
  if (/^\+\d+\s+more$/i.test(c)) return "plus_more";
  if (/\blogo$/i.test(c)) return "logo_suffix";
  if (/^best for:/i.test(c)) return "best_for_chip";
  if (/^serves:/i.test(c)) return "serves_chip";
  if (/\bSLA\b/i.test(c)) return "sla_chip";
  if (/^showing\b/i.test(c) || /^filter/i.test(c) || /^sort by/i.test(c)) return "ui_chrome";
  if (/^view (all|more)/i.test(c)) return "ui_chrome";
  if (COUNTRY_ONLY_RE.test(c)) return "country_only";
  if (/\((XDR|MDR|IAM|SOCaaS|EDR|SIEM)\)/i.test(c)) return "product_chip";
  if (c.length > 80) return "long_blurb";
  if (LOCATION_RE.test(c) && c.length < 55) return "location_line";
  if (CITY_COUNTRY_RE.test(c)) return "city_country";
  if (GENERIC_SERVICE_RE.test(c)) return "generic_service";
  if (/^(north america|europe|asia|latam|united states|worldwide)$/i.test(c)) {
    return "geo_label";
  }
  if (/\bis (a|an|one of)\b/i.test(c) && c.length > 40) return "short_blurb";
  // Card blurbs: "Vinson provides managed cybersecurity…"
  if (
    c.length > 35 &&
    /\b(provides|delivers|offers|specializ(?:e|es|ing)|helping businesses)\b/i.test(c)
  ) {
    return "card_blurb";
  }
  if (/^\d[\d,]*\+?\s*(employees|emp)/i.test(c)) return "emp_chip";
  if (/^\d+\s*-\s*\d+\s*employees/i.test(c)) return "emp_chip";
  if (/^\$[\d,]+/i.test(c)) return "price_chip";
  // Service chips without product acronyms
  if (/^vulnerability management$/i.test(c)) return "generic_service";
  return null;
}

export function isDirectoryPasteNoise(company: string): boolean {
  return directoryPasteNoiseReason(company) != null;
}
