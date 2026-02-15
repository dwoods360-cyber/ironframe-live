export type Industry = "Healthcare" | "Finance" | "Energy";
export type RiskTier = "CRITICAL" | "HIGH" | "LOW";
export type VendorCadenceStatus = "90" | "60" | "30" | "OVERDUE";
export type VendorType = "SaaS" | "On-Prem Software" | "Managed Services" | "Hardware";

export type VendorRecord = {
  vendorName: string;
  associatedEntity: string;
  industry: Industry;
  vendorType?: VendorType;
  riskTier: RiskTier;
  securityRating: string;
  contractStatus: string;
  documentExpirationDate: string;
  lastRequestSent: string | null;
  currentCadence: VendorCadenceStatus;
  criticalSubProcessors: Array<{
    name: string;
    status: "SECURE" | "BREACH";
  }>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDaysFromNow(days: number) {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

export function getDaysUntilExpiration(documentExpirationDate: string, nowMs = Date.now()) {
  const expirationMs = new Date(documentExpirationDate).getTime();
  if (Number.isNaN(expirationMs)) {
    return -1;
  }

  return Math.ceil((expirationMs - nowMs) / DAY_MS);
}

export function resolveCadenceStatus(daysUntilExpiration: number): VendorCadenceStatus {
  if (daysUntilExpiration <= 0) {
    return "OVERDUE";
  }

  if (daysUntilExpiration <= 30) {
    return "30";
  }

  if (daysUntilExpiration <= 60) {
    return "60";
  }

  return "90";
}

export const MASTER_VENDORS: VendorRecord[] = [
  {
    vendorName: "Azure Health",
    associatedEntity: "MEDSHIELD",
    industry: "Healthcare",
    riskTier: "HIGH",
    securityRating: "84/100",
    contractStatus: "VIOLATION DETECTED",
    documentExpirationDate: isoDaysFromNow(72),
    lastRequestSent: null,
    currentCadence: "90",
    criticalSubProcessors: [
      { name: "MediTransit CDN", status: "SECURE" },
      { name: "KubeOps EU-West", status: "BREACH" },
    ],
  },
  {
    vendorName: "Stripe",
    associatedEntity: "VAULTBANK",
    industry: "Finance",
    riskTier: "HIGH",
    securityRating: "85/100",
    contractStatus: "HEIGHTENED OVERSIGHT",
    documentExpirationDate: isoDaysFromNow(42),
    lastRequestSent: null,
    currentCadence: "60",
    criticalSubProcessors: [
      { name: "Payment Gateway Relay", status: "SECURE" },
      { name: "Card Network Bridge", status: "SECURE" },
    ],
  },
  {
    vendorName: "SWIFT",
    associatedEntity: "VAULTBANK",
    industry: "Finance",
    riskTier: "CRITICAL",
    securityRating: "79/100",
    contractStatus: "HEIGHTENED OVERSIGHT",
    documentExpirationDate: isoDaysFromNow(66),
    lastRequestSent: null,
    currentCadence: "90",
    criticalSubProcessors: [
      { name: "InterBank Relay-9", status: "SECURE" },
      { name: "LatencyMesh Core", status: "SECURE" },
    ],
  },
  {
    vendorName: "Schneider Electric",
    associatedEntity: "GRIDCORE",
    industry: "Energy",
    riskTier: "HIGH",
    securityRating: "88/100",
    contractStatus: "VIOLATION DETECTED",
    documentExpirationDate: isoDaysFromNow(58),
    lastRequestSent: null,
    currentCadence: "60",
    criticalSubProcessors: [
      { name: "GridSensor Fabric", status: "BREACH" },
      { name: "OT Firmware Vault", status: "SECURE" },
    ],
  },
  {
    vendorName: "GCP Cloud",
    associatedEntity: "MEDSHIELD",
    industry: "Healthcare",
    riskTier: "LOW",
    securityRating: "93/100",
    contractStatus: "COMPLIANT",
    documentExpirationDate: isoDaysFromNow(110),
    lastRequestSent: null,
    currentCadence: "90",
    criticalSubProcessors: [
      { name: "GCP Logging Layer", status: "SECURE" },
      { name: "Identity Edge Proxy", status: "SECURE" },
    ],
  },
  {
    vendorName: "Twilio",
    associatedEntity: "VAULTBANK",
    industry: "Finance",
    riskTier: "HIGH",
    securityRating: "86/100",
    contractStatus: "DUE DILIGENCE REQUIRED",
    documentExpirationDate: isoDaysFromNow(95),
    lastRequestSent: null,
    currentCadence: "90",
    criticalSubProcessors: [
      { name: "VoiceRoute Exchange", status: "SECURE" },
      { name: "Messaging Queue South", status: "SECURE" },
    ],
  },
  {
    vendorName: "Crowdstrike",
    associatedEntity: "GRIDCORE",
    industry: "Energy",
    riskTier: "LOW",
    securityRating: "95/100",
    contractStatus: "COMPLIANT",
    documentExpirationDate: isoDaysFromNow(44),
    lastRequestSent: null,
    currentCadence: "60",
    criticalSubProcessors: [
      { name: "ThreatGraph Edge", status: "SECURE" },
      { name: "Signature Delta Cache", status: "SECURE" },
    ],
  },
  {
    vendorName: "ServiceNow",
    associatedEntity: "MEDSHIELD",
    industry: "Healthcare",
    riskTier: "LOW",
    securityRating: "90/100",
    contractStatus: "CONTRACT MONITORED",
    documentExpirationDate: isoDaysFromNow(84),
    lastRequestSent: null,
    currentCadence: "90",
    criticalSubProcessors: [
      { name: "Workflow Runtime", status: "SECURE" },
      { name: "Process Ledger", status: "SECURE" },
    ],
  },
  {
    vendorName: "Palo Alto Networks",
    associatedEntity: "VAULTBANK",
    industry: "Finance",
    riskTier: "CRITICAL",
    securityRating: "82/100",
    contractStatus: "VIOLATION DETECTED",
    documentExpirationDate: isoDaysFromNow(37),
    lastRequestSent: null,
    currentCadence: "60",
    criticalSubProcessors: [
      { name: "Packet Shield Mesh", status: "SECURE" },
      { name: "Identity Signature Broker", status: "SECURE" },
    ],
  },
];
