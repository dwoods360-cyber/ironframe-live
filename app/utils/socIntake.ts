export type SocIncomingEmail = {
  id: string;
  sender: string;
  subject: string;
  body: string;
  receivedAt: string;
};

export type ParsedSocAlert = {
  id: string;
  title: string;
  impact: string;
  severityScore: number;
  liabilityUsd: number;
  createdAt: string;
};

type ParseContext = {
  enabled: boolean;
  authorizedDomains: string[];
};

type ParsedResult = {
  alert: ParsedSocAlert | null;
  rejectionReason: "ENGINE_DISABLED" | "UNAUTHORIZED_SENDER" | null;
  senderDomain: string;
  isVerifiedSender: boolean;
};

function deriveSeverity(subject: string, liabilityUsd: number) {
  const normalized = subject.toUpperCase();

  if (normalized.includes("CRITICAL")) {
    return Math.min(100, Math.round((liabilityUsd / 12_000_000) * 100));
  }

  if (normalized.includes("HIGH")) {
    return 74;
  }

  return 52;
}

export function parseSocEmailToAlert(email: SocIncomingEmail, context: ParseContext): ParsedResult {
  if (!context.enabled) {
    return {
      alert: null,
      rejectionReason: "ENGINE_DISABLED",
      senderDomain: "",
      isVerifiedSender: false,
    };
  }

  const senderDomain = email.sender.split("@").at(1)?.trim().toLowerCase().replace(/^@/, "") ?? "";
  const domain = senderDomain;
  const domainIsAuthorized = context.authorizedDomains.includes(domain);
  if (!domainIsAuthorized) {
    return {
      alert: null,
      rejectionReason: "UNAUTHORIZED_SENDER",
      senderDomain,
      isVerifiedSender: false,
    };
  }

  const liabilityUsd = 11_100_000;
  const severityScore = deriveSeverity(email.subject, liabilityUsd);

  return {
    alert: {
      id: `soc-${email.id}`,
      title: email.subject.startsWith("CRITICAL:") ? email.subject.replace("CRITICAL:", "").trim() : email.subject,
      impact: "External SOC escalation mapped to Tier 1 exposure with upstream vendor dependency risk.",
      severityScore,
      liabilityUsd,
      createdAt: email.receivedAt,
    },
    rejectionReason: null,
    senderDomain,
    isVerifiedSender: true,
  };
}

export function simulateSocEmail(): SocIncomingEmail {
  return {
    id: "critical-firewall-breach-medshield",
    sender: "alerts@medshield.com",
    subject: "CRITICAL: Firewall Breach",
    body: "Potential perimeter bypass observed on SOC telemetry.",
    receivedAt: new Date().toISOString(),
  };
}
