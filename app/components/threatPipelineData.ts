export type ThreatItem = {
  id: string;
  title: string;
  severity: "HIGH" | "CRITICAL";
  description: string;
};

export const THREAT_PIPELINE_DATA: Record<string, ThreatItem> = {
  privilegeEscalation: {
    id: "privilege-escalation",
    title: "PRIVILEGE ESCALATION",
    severity: "HIGH",
    description: 'User "Service_Admin" modified root permissions',
  },
  vulnerabilityDetected: {
    id: "vulnerability-detected",
    title: "VULNERABILITY DETECTED",
    severity: "HIGH",
    description: "CVE-2026-0042 (Critical) found in Apache Log4j",
  },
  transactionFraud: {
    id: "transaction-fraud",
    title: "TRANSACTION FRAUD",
    severity: "CRITICAL",
    description: "Anomalous transfer chain detected targeting SWIFT Core settlement path",
  },
  vulnerabilityDetectedScada: {
    id: "vulnerability-detected-scada",
    title: "VULNERABILITY DETECTED",
    severity: "HIGH",
    description: "SCADA Master Terminal exposure detected in external-facing diagnostic service",
  },
};
