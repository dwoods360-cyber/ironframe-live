/**
 * Path B Fit classifier — shared by Account Research Brief + pipeline rescore.
 * GateResult: PASS | ADJACENT | FAIL | UNKNOWN (CHANNEL maps to FAIL + channel hold).
 */

export type PathBFitResult = "PASS" | "ADJACENT" | "FAIL" | "UNKNOWN";

export type PathBFitClassification = {
  result: PathBFitResult;
  /** True when account should be parked as channel_competitor (not Path B cold). */
  channelCompetitor: boolean;
  services: string[];
  finding: string;
  why: string;
};

const SERVICE_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bmssp\b|managed\s+security\s+service/i, label: "MSSP" },
  { re: /\bvciso\b|virtual\s+ciso|fractional\s+ciso/i, label: "vCISO" },
  {
    re: /\bmanaged\s+grc\b|grc[-\s]+as[-\s]+a[-\s]+service|compliance[-\s]+as[-\s]+a[-\s]+service/i,
    label: "managed GRC",
  },
  { re: /\bpenetration\s+test|\bpentest\b|\bred\s+team/i, label: "offensive security" },
  { re: /\bsoc\b|security\s+operations/i, label: "SOC" },
  { re: /\bincident\s+response\b|\bir\s+retainer/i, label: "incident response" },
  {
    re: /\baudit\s+support|compliance\s+assessment|compliance\s+advisory|cmmc\s+(consult|practic|advisory|program)|managed\s+compliance/i,
    label: "compliance advisory",
  },
  { re: /\bmsp\b|managed\s+(it|services)\b/i, label: "MSP" },
  { re: /\bmdr\b|managed\s+detection/i, label: "MDR" },
];

const PASS_SERVICES = new Set(["MSSP", "vCISO", "managed GRC", "compliance advisory"]);
const ADJACENT_SERVICES = new Set([
  "SOC",
  "incident response",
  "offensive security",
  "MSP",
  "MDR",
]);

/** Strong Path B Fit language — not bare "cybersecurity". */
const PASS_CORPUS_RE =
  /\bmssp\b|managed\s+security\s+service|\bvciso\b|virtual\s+ciso|fractional\s+ciso|managed\s+grc|grc[-\s]+as[-\s]+a[-\s]+service|compliance[-\s]+as[-\s]+a[-\s]+service|compliance\s+advisory|cmmc\s+(consult|practic|advisory)/i;

const ADJACENT_CORPUS_RE =
  /\bmsp\b|managed\s+(it|services)\b|\bmdr\b|managed\s+detection|\bsoc\s+as\s+a\s+service|\bpenetration\s+test|\bpentest\b|\bred\s+team|\bincident\s+response\b|cybersecurity|managed\s+security/i;

/** Product / platform sold to MSPs — channel, not Path B delivery ICP. */
const CHANNEL_VENDOR_RE =
  /\bfor\s+msps?\b|\bfor\s+mssps?\b|platform\s+for\s+msp|msp[-\s]?focused|white[-\s]?label\s+security\s+platform|open\s*xdr.*msp|\bn-?able\b|\badlumin\b/i;

const COMPETING_PRODUCT_RE = /\boscar\b|\bradius\s*360\b|\bradius360\b|\buv\s*lens\b/i;

/**
 * Prior operator / brief language that already ruled out Path B ICP.
 * Must run before MSSP/vCISO regexes — those words often appear in negation
 * ("not a Path B MSP/vCISO design partner") and would otherwise false-PASS.
 */
const PATH_B_ICP_FAIL_RE =
  /(?<![Nn]ot\s)\bproduct\s+oem\b|(?<![Nn]ot\s)\bproduct\s+vendor\b|\bwrong\s+path\s+b\b|\bnot\s+a\s+path\s+b\b|mega[-\s]+(si|firm|telco|global|aggregator)|harvest\s+superseded|human[-\s]?risk|endpoint\/antivirus|security\s+product\s+line|design[-\s]?partner\s+icp|proprietary\s+\w*\s*grc|\btruops\b/i;

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

/** True when corpus/practice already documents Path B ICP fail (OEM / mega SI / product). */
export function isPathBIcpFailCorpus(corpus: string): boolean {
  return PATH_B_ICP_FAIL_RE.test(String(corpus || ""));
}

export function detectFitServices(corpus: string, company: string): string[] {
  const hay = `${company}\n${corpus}`;
  return uniqueStrings(
    SERVICE_PATTERNS.filter((row) => row.re.test(hay)).map((row) => row.label),
  );
}

export function classifyPathBFit(input: {
  company: string;
  industrySector?: string | null;
  websiteUrl?: string | null;
  corpus?: string | null;
  /** Forced Path B HOLD / shortlist competitor. */
  pathBHold?: boolean;
  products?: string[] | null;
}): PathBFitClassification {
  const company = String(input.company || "");
  const corpus = String(input.corpus || "");
  const haystack = [company, input.industrySector, input.websiteUrl, corpus]
    .filter(Boolean)
    .join("\n");
  const services = detectFitServices(haystack, company);
  const products = input.products ?? [];
  const competingProduct =
    products.some((p) => /oscar|radius360/i.test(p)) || COMPETING_PRODUCT_RE.test(haystack);

  if (input.pathBHold || competingProduct) {
    return {
      result: "FAIL",
      channelCompetitor: true,
      services,
      finding: competingProduct
        ? "Proprietary GRC / competing platform detected — Path B cold blocked."
        : "Account is on the Path B HOLD / channel-competitor shortlist.",
      why: "Channel / competitor — park; do not Promote as design partner.",
    };
  }

  if (PATH_B_ICP_FAIL_RE.test(haystack)) {
    return {
      result: "FAIL",
      channelCompetitor: true,
      services,
      finding:
        "Prior research / practice type documents Path B ICP fail (product OEM, mega SI/telco, or product vendor).",
      why: "Park as channel_competitor / research-only — not Path B cold design partner.",
    };
  }

  if (CHANNEL_VENDOR_RE.test(haystack)) {
    return {
      result: "FAIL",
      channelCompetitor: true,
      services,
      finding:
        "Public positioning is a security platform / product sold to MSPs or MSSPs — not a Path B delivery practice.",
      why: "Channel / product vendor — park as channel_competitor.",
    };
  }

  const passByService = services.some((s) => PASS_SERVICES.has(s));
  const passByCorpus = PASS_CORPUS_RE.test(haystack);
  if (passByService || passByCorpus) {
    return {
      result: "PASS",
      channelCompetitor: false,
      services,
      finding: services.length
        ? `Public site signals: ${services.join(", ")}.`
        : "Strong MSSP / vCISO / managed-GRC / compliance-advisory language detected.",
      why: "Path B design partners need a real MSSP, vCISO, or managed-GRC motion.",
    };
  }

  const adjacentByService = services.some((s) => ADJACENT_SERVICES.has(s));
  const adjacentByCorpus = ADJACENT_CORPUS_RE.test(haystack);
  if (adjacentByService || adjacentByCorpus) {
    return {
      result: "ADJACENT",
      channelCompetitor: false,
      services,
      finding: services.length
        ? `Adjacent signals: ${services.join(", ")} — no clear MSSP/vCISO/managed-GRC portfolio motion.`
        : "MSP / SOC / IR / cyber delivery language without clear Path B Fit PASS signals.",
      why: "2nd-tier Fit — not Path B Promote. Keep research / enrich_later.",
    };
  }

  if (corpus.trim()) {
    return {
      result: "UNKNOWN",
      channelCompetitor: false,
      services,
      finding: "Public pages fetched but Path B Fit signals were not clearly detected.",
      why: "Operator should confirm practice type before Promote.",
    };
  }

  if (input.websiteUrl?.trim()) {
    return {
      result: "UNKNOWN",
      channelCompetitor: false,
      services,
      finding: "Website is on file, but no fetched page text is loaded into this brief yet.",
      why: "Re-run Research only so Fit can read the public site.",
    };
  }

  return {
    result: "UNKNOWN",
    channelCompetitor: false,
    services,
    finding: "Insufficient public corpus to confirm practice type.",
    why: "Add website/domain and re-run research before Fit can Pass.",
  };
}
