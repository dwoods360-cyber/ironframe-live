/**
 * Company-motion copy for Path B Touch 2–4.
 * Keeps criteriaFocus / gift diagnostic / breakup priority specific to operating type
 * (CMMC/DIB, HIPAA/GLBA, MDR/SOC, fin/health MSP, etc.) — not generic MSSP paste.
 */

export type SalesMotionKind =
  | "cmmc_dib"
  | "hipaa_glba"
  | "fin_health_msp"
  | "mdr_soc"
  | "grc_vciso"
  | "managed_it_multi"
  | "generic_mssp";

export type Touch3Checks = readonly [string, string, string];

export function classifySalesMotion(text: string): SalesMotionKind {
  const t = String(text || "").toLowerCase();
  // MDR/SOC delivery wins over incidental CMMC/HIPAA "support" tags in the motion string.
  if (/mdr|mxdr|cyber sentry|24\/7|defense-in-depth/.test(t) && /soc\b|mdr|mxdr|sentry/.test(t)) {
    return "mdr_soc";
  }
  if (/cmmc|dfars|dib|nist\s*800-171|cui\b/.test(t) && !/mdr|mxdr|cyber sentry/.test(t)) {
    return "cmmc_dib";
  }
  if (/hipaa|glba|nydfs|hitrust|phi\b|baa\b/.test(t) && !/mdr|mxdr/.test(t)) {
    return "hipaa_glba";
  }
  if (/financial-services|financial services|fintech|board reporting.*health|health.*board/.test(t)) {
    return "fin_health_msp";
  }
  if (/soc\b|soc 2/.test(t)) return "mdr_soc";
  if (/vciso|fractional ciso|grc\b|attestation|advisory/.test(t)) return "grc_vciso";
  if (/managed it|multi-vertical|smb|msp\b/.test(t)) return "managed_it_multi";
  if (/cmmc|dfars|dib/.test(t)) return "cmmc_dib";
  if (/hipaa|glba|nydfs/.test(t)) return "hipaa_glba";
  return "generic_mssp";
}

/** Short phrase after "isolating" in Touch 2 economics — company + motion. */
export function criteriaFocusFor(input: {
  company: string;
  motion?: string | null;
  kind?: SalesMotionKind;
}): string {
  const company = String(input.company || "your").trim() || "your";
  const kind = input.kind ?? classifySalesMotion(input.motion || company);
  switch (kind) {
    case "cmmc_dib":
      return `${company} CMMC / DIB client evidence registers`;
    case "hipaa_glba":
      return `${company} HIPAA / GLBA client evidence registers`;
    case "fin_health_msp":
      return `${company} financial-services and healthcare client registers`;
    case "mdr_soc":
      return `${company} MDR / SOC client evidence registers`;
    case "grc_vciso":
      return `${company} GRC and board-reporting registers`;
    case "managed_it_multi":
      return `${company} multi-client compliance registers`;
    default:
      return `${company} client evidence registers`;
  }
}

export function touch3AudienceFor(kind: SalesMotionKind): string {
  switch (kind) {
    case "cmmc_dib":
      return "CMMC / DIB teams";
    case "hipaa_glba":
      return "HIPAA / GLBA teams";
    case "fin_health_msp":
      return "financial-services and healthcare compliance teams";
    case "mdr_soc":
      return "MDR / SOC teams";
    case "grc_vciso":
      return "vCISO / GRC teams running more than one retainer";
    case "managed_it_multi":
      return "managed IT teams running client compliance across verticals";
    default:
      return "teams running compliance for more than one client";
  }
}

/** Spoken self-audit checks — no HTTP/BIGINT/catalog jargon. */
export function touch3ChecksFor(kind: SalesMotionKind): Touch3Checks {
  switch (kind) {
    case "cmmc_dib":
      return [
        "When a DIB client fills out a questionnaire, do you treat that as proof — or wait until you have something independent to back it?",
        "Could one DIB client's CUI or control evidence ever show up in another client's report?",
        "When you roll dollars up across engagements, do the numbers stay consistent?",
      ];
    case "hipaa_glba":
      return [
        "When a client or vendor sends an attestation, do you treat it as finished — or wait for something independent to back it?",
        "Could one client's PHI or GLBA evidence ever show up in another client's portal?",
        "When you roll healthcare or financial numbers together, do the dollars stay consistent?",
      ];
    case "fin_health_msp":
      return [
        "When a client fills out a questionnaire, do you treat that as proof — or wait until you have something independent to back it?",
        "Could one client's board pack or compliance evidence ever leak into another client's view?",
        "When you roll financial and healthcare numbers together, do the dollars stay consistent?",
      ];
    case "mdr_soc":
      return [
        "When a client fills out a questionnaire, do you treat that as proof — or wait until you have something independent to back it?",
        "Could one client's detection trail or evidence ever show up in another client's report?",
        "When you roll dollars up across SOC clients, do the numbers stay consistent?",
      ];
    case "grc_vciso":
      return [
        "When a retainer client sends an attestation, do you treat it as finished — or wait for something independent to back it?",
        "Could one retainer's evidence pack ever show up in another client's board or portal view?",
        "When you roll dollars up across retainers, do the numbers stay consistent?",
      ];
    case "managed_it_multi":
      return [
        "When a client or vendor fills out a questionnaire, do you treat that as proof — or wait for something independent?",
        "Could one client's evidence ever show up in another client's portal?",
        "When you roll dollars up across verticals, do the numbers stay consistent?",
      ];
    default:
      return [
        "When a client or vendor fills out a questionnaire, do you treat that as proof — or wait for something independent?",
        "Could one client's evidence ever show up in another client's report?",
        "When you roll dollars up across clients, do the numbers stay consistent?",
      ];
  }
}

export function touch3SubjectFor(input: {
  touch1Subject?: string | null;
  company: string;
  kind?: SalesMotionKind;
}): string {
  const prior = String(input.touch1Subject || "").trim();
  if (prior) return /^Re:/i.test(prior) ? prior : `Re: ${prior}`;
  const kind = input.kind ?? "generic_mssp";
  const noun =
    kind === "cmmc_dib"
      ? "CMMC evidence isolation"
      : kind === "hipaa_glba"
        ? "HIPAA / GLBA evidence isolation"
        : kind === "mdr_soc"
          ? "MDR / SOC evidence isolation"
          : "multi-client evidence isolation";
  return `Re: ${noun} — ${input.company}`;
}

/**
 * Clean Breakup (Touch 4) priority phrase — company + motion, under ~4 sentences total body.
 * Scope: this Design Partner thread / cohort — not a forever company ban.
 */
export function breakupPriorityFor(input: {
  company: string;
  motion?: string | null;
  kind?: SalesMotionKind;
}): string {
  const company = String(input.company || "your team").trim() || "your team";
  const kind = input.kind ?? classifySalesMotion(input.motion || company);
  switch (kind) {
    case "cmmc_dib":
      return `keeping CMMC / DIB evidence cleanly separated isn't a live priority for ${company} this quarter`;
    case "hipaa_glba":
      return `keeping HIPAA / GLBA client evidence separated isn't a live priority for ${company} this quarter`;
    case "fin_health_msp":
      return `keeping financial-services and healthcare client evidence separated isn't a live priority for ${company} this quarter`;
    case "mdr_soc":
      return `keeping MDR / SOC client evidence separated isn't a live priority for ${company} this quarter`;
    case "grc_vciso":
      return `keeping GRC / board packs separated by client isn't a live priority for ${company} this quarter`;
    case "managed_it_multi":
      return `keeping client compliance evidence separated isn't a live priority for ${company} this quarter`;
    default:
      return `keeping client evidence separated isn't a live priority for ${company} this quarter`;
  }
}

