/**
 * Data-driven threat intelligence library (2025/2026 industry baselines).
 * `THREAT_MAP` keys are fixed industry enums; UI labels map via `mapUiIndustryToThreatEnum`.
 */

export const IndustryThreatEnum = {
  HEALTHCARE: "HEALTHCARE",
  FINANCE: "FINANCE",
  TECHNOLOGY: "TECHNOLOGY",
  PUBLIC_SECTOR: "PUBLIC_SECTOR",
} as const;

export type IndustryThreatEnumKey = (typeof IndustryThreatEnum)[keyof typeof IndustryThreatEnum];

export type ThreatImpactLevel = "CRITICAL" | "HIGH" | "MEDIUM";

export type ThreatAgentId = "IRON_PHISH" | "IRON_INFIL" | "IRON_SIGHT";

export type ThreatLureType = "FINANCIAL" | "CREDENTIAL" | "MALWARE";

export type ThreatIntelEntry = {
  id: string;
  title: string;
  /** One paragraph: TTPs + representative business / regulatory impact (education & audit trail). */
  summary: string;
  impact: ThreatImpactLevel;
  source: string;
  agentId: ThreatAgentId;
  lureType: ThreatLureType;
};

/** Primary dataset: industry enum → authoritative threat rows. */
export const THREAT_MAP: Record<IndustryThreatEnumKey, ThreatIntelEntry[]> = {
  HEALTHCARE: [
    {
      id: "hc-phi-extort",
      title: "PHI Extortion & Data Lock",
      summary:
        "Starts with spear-phishing or compromised billing credentials, then pivots to EHR interfaces, backup agents, or VPN to encrypt or exfiltrate PHI. Attackers pressure payment under short deadlines while dual-extortion posts drive regulatory scrutiny. Industry data consistently ranks healthcare among the highest per-record breach costs; downtime and diverted clinical staff amplify losses beyond ransom alone, with HIPAA breach notification and OCR exposure often following within days.",
      impact: "CRITICAL",
      source: "2025 Verizon DBIR",
      agentId: "IRON_PHISH",
      lureType: "FINANCIAL",
    },
    {
      id: "hc-ransomware",
      title: "Ransomware & Care-Delivery Disruption",
      summary:
        "Operator gains foothold via stolen creds, exposed RDP, or a trusted software supply path, then deploys file-encrypting payloads across imaging, AD, and VoIP dependencies. Real-world impact includes elective surgery cancellations, ambulance diversion, and manual charting at large per-hour outage rates. IBM and sector studies tie healthcare ransomware to extended recovery windows and some of the highest average total breach costs when patient care continuity is impaired.",
      impact: "CRITICAL",
      source: "IBM 2025 Cost of a Data Breach Report",
      agentId: "IRON_SIGHT",
      lureType: "MALWARE",
    },
    {
      id: "hc-insider-cred",
      title: "Insider & Partner Credential Misuse",
      summary:
        "Begins with excessive shared accounts, weak MFA on vendor portals, or phishing against business associates; lateral movement mimics legitimate support sessions into clinical apps. Unlike noisy ransomware, abuse can persist for months while PHI is copied in bulk. Verizon DBIR patterns show misuse and credential abuse remain top paths in healthcare incidents, with fines and class actions scaling to millions when thousands of records are involved.",
      impact: "HIGH",
      source: "2025 Verizon DBIR",
      agentId: "IRON_INFIL",
      lureType: "CREDENTIAL",
    },
  ],
  FINANCE: [
    {
      id: "fin-bec-wire",
      title: "BEC / Authorized Push Payment Fraud",
      summary:
        "Starts with spoofed executive or vendor email threads, domain lookalikes, and urgency to bypass dual-control wire policies; some chains add MFA fatigue or session theft from helpdesk resets. Funds exit via mule accounts in hours. IBM breach-cost studies highlight financial services’ elevated average incident expense driven by fraud loss, regulatory inquiry, and customer reimbursement programs when APP or BEC succeeds at scale.",
      impact: "CRITICAL",
      source: "IBM 2025 Cost of a Data Breach Report",
      agentId: "IRON_PHISH",
      lureType: "FINANCIAL",
    },
    {
      id: "fin-cred-stuffing",
      title: "Credential Stuffing & ATO at Scale",
      summary:
        "Attackers replay billions of recycled username/password pairs against retail banking and card portals, then automate balance transfers and PII changes where step-up auth is weak. Technical markers include impossible travel, device fingerprint churn, and API error spikes. Verizon DBIR continues to show stolen credentials and brute-force adjacent patterns among the most common paths into confirmed breaches, with median loss per incident climbing when ATO spans many accounts.",
      impact: "HIGH",
      source: "2025 Verizon DBIR",
      agentId: "IRON_INFIL",
      lureType: "CREDENTIAL",
    },
    {
      id: "fin-api-systemic",
      title: "Systemic API & Core Banking Exposure",
      summary:
        "Often begins with over-privileged service accounts, shadow APIs, or a compromised CI secret that reaches payment switches and ledger microservices. Blast radius spans fraud scoring, open-banking partners, and batch settlement windows. Sector reporting ties high API dependency to systemic outage risk and multi-million remediation when integrity or confidentiality of transaction data is in doubt across regions.",
      impact: "CRITICAL",
      source: "IBM 2025 Cost of a Data Breach Report",
      agentId: "IRON_SIGHT",
      lureType: "MALWARE",
    },
  ],
  TECHNOLOGY: [
    {
      id: "tech-supply-poison",
      title: "Supply Chain & Build-Pipeline Poisoning",
      summary:
        "Starts with compromise of a maintainer account, poisoned package update, or hijacked artifact registry token; malicious code ships through CI/CD to production workloads. Customers inherit trust without a second control. Verizon DBIR and industry post-mortems document software supply-chain incidents among the fastest-growing systemic risks, with revenue impact from revoked certs, customer churn, and emergency rebuilds often exceeding single-app breach averages.",
      impact: "CRITICAL",
      source: "2025 Verizon DBIR",
      agentId: "IRON_INFIL",
      lureType: "MALWARE",
    },
    {
      id: "tech-ip-exfil",
      title: "IP & Source-Code Exfiltration",
      summary:
        "Typically opens with targeted phishing against engineers or compromised SaaS tokens, then uses git mirroring, artifact dumps, or notebook exfil over HTTPS. Trade-secret theft can erase competitive advantage long before litigation concludes. IBM sector analyses note technology firms face elevated breach costs when R&D and roadmap data are exposed, including accelerated patch cycles and M&A due-diligence penalties.",
      impact: "HIGH",
      source: "IBM 2025 Cost of a Data Breach Report",
      agentId: "IRON_PHISH",
      lureType: "CREDENTIAL",
    },
    {
      id: "tech-cloud-lateral",
      title: "Cloud Misconfiguration & Lateral Movement",
      summary:
        "Attackers enumerate public storage buckets, IAM trust chains, and metadata services; SSRF or stolen cloud keys pivot into kube-apiserver and data stores. Real-world impact includes cryptomining burn, customer PII exposure, and cross-tenant noise on shared platforms. DBIR-style patterns show misconfiguration and credential theft remain dominant cloud-adjacent vectors, with mean time to containment tied to visibility gaps across accounts and regions.",
      impact: "HIGH",
      source: "2025 Verizon DBIR",
      agentId: "IRON_SIGHT",
      lureType: "MALWARE",
    },
  ],
  PUBLIC_SECTOR: [
    {
      id: "ps-citizen-phish",
      title: "Citizen-Service Phishing & Fraud",
      summary:
        "Starts with SMS or email lures impersonating tax, benefits, or licensing portals; harvested credentials feed synthetic identity fraud and unauthorized case changes. Technical controls often lag peak filing seasons. Public-sector reporting aligned with DBIR social-engineering trends shows citizen-facing phish scales quickly at low marginal cost, with downstream fraud losses and trust erosion measured in diverted staff time and emergency communications campaigns.",
      impact: "HIGH",
      source: "2025 Verizon DBIR",
      agentId: "IRON_PHISH",
      lureType: "CREDENTIAL",
    },
    {
      id: "ps-ransom",
      title: "Ransomware Against Public Services",
      summary:
        "Initial access via phishing, exposed remote access, or a managed service provider, followed by domain-wide encryption of records management, 911 adjunct systems, or school ERPs. Outages delay permits, payroll, and emergency coordination. IBM and sector studies cite public-sector incidents among the most disruptive per capita when legacy recovery and interagency dependencies stretch downtime into weeks of manual operations.",
      impact: "CRITICAL",
      source: "IBM 2025 Cost of a Data Breach Report",
      agentId: "IRON_SIGHT",
      lureType: "MALWARE",
    },
    {
      id: "ps-third-party",
      title: "Third-Party & Shared-Service Breach",
      summary:
        "Begins at a SaaS vendor, payroll processor, or regional shared IT consortium; attackers move through federated SSO into multiple agencies with one set of keys. Data scope can span eligibility and payroll without a direct breach of each agency perimeter. DBIR partner and system-intrusion narratives emphasize third-party concentration risk: one incident triggers parallel notification obligations and audit costs across many budgets.",
      impact: "MEDIUM",
      source: "2025 Verizon DBIR",
      agentId: "IRON_INFIL",
      lureType: "CREDENTIAL",
    },
  ],
};

const UI_INDUSTRY_TO_ENUM: Record<string, IndustryThreatEnumKey> = {
  Healthcare: "HEALTHCARE",
  Finance: "FINANCE",
  Technology: "TECHNOLOGY",
  "Public Sector": "PUBLIC_SECTOR",
  Defense: "PUBLIC_SECTOR",
  "Federal Government": "PUBLIC_SECTOR",
  Aerospace: "TECHNOLOGY",
  "State & Local": "PUBLIC_SECTOR",
  Manufacturing: "TECHNOLOGY",
  Retail: "FINANCE",
  Infrastructure: "PUBLIC_SECTOR",
};

const ENUM_TO_UI_INDUSTRY: Record<IndustryThreatEnumKey, string> = {
  HEALTHCARE: "Healthcare",
  FINANCE: "Finance",
  TECHNOLOGY: "Technology",
  PUBLIC_SECTOR: "Public Sector",
};

/** Reference loss in $M for simulation economics (derived from impact tier). */
export function threatImpactToLossM(impact: ThreatImpactLevel): number {
  switch (impact) {
    case "CRITICAL":
      return 8.5;
    case "HIGH":
      return 5.5;
    case "MEDIUM":
      return 3.2;
    default:
      return 3.2;
  }
}

export function mapUiIndustryToThreatEnum(ui: string | null | undefined): IndustryThreatEnumKey {
  const k = (ui ?? "").trim();
  return UI_INDUSTRY_TO_ENUM[k] ?? "HEALTHCARE";
}

export function industryDisplayFromThreatEnum(bucket: IndustryThreatEnumKey): string {
  return ENUM_TO_UI_INDUSTRY[bucket];
}

export function getThreatsForIndustry(selectedIndustry: string | undefined | null): ThreatIntelEntry[] {
  const key = mapUiIndustryToThreatEnum(selectedIndustry);
  return THREAT_MAP[key];
}

type ThreatLookupHit = { bucket: IndustryThreatEnumKey; entry: ThreatIntelEntry };

function buildThreatIndex(): Map<string, ThreatLookupHit> {
  const m = new Map<string, ThreatLookupHit>();
  for (const bucket of Object.keys(THREAT_MAP) as IndustryThreatEnumKey[]) {
    for (const entry of THREAT_MAP[bucket]) {
      m.set(entry.id, { bucket, entry });
    }
  }
  return m;
}

const THREAT_BY_ID = buildThreatIndex();

export function findThreatIntelById(threatId: string): ThreatLookupHit | null {
  return THREAT_BY_ID.get(threatId) ?? null;
}

/** @deprecated Use `THREAT_MAP` / `ThreatIntelEntry`; kept for legacy imports if needed. */
export type StrategicThreatRoute = "BEC" | "RANSOMWARE" | "SUPPLY_CHAIN" | "PHISH";
