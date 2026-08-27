import type { AuditRecord } from "@/lib/capstone/exportPackage";
import { FELLOWS_ACADEMIC_SANDBOX_ID, FELLOWS_LAB_CLIENT_A } from "@/config/fellowsPortal";

/** Synthetic vendor questionnaire — never verified; Mission 02 promote target. */
export const LAB_UNTRUSTED_VENDOR_ARTIFACT = {
  artifactId: "vendor-q-unverified-001",
  label: "Synthetic vendor security questionnaire (pre-seeded)",
  verificationStatus: "UNVERIFIED" as const,
  source: "external_tprm_upload",
};

export function buildLabAuditRegister(fellowShortId: string): AuditRecord[] {
  const now = new Date().toISOString();
  const operator = `fellow:${fellowShortId}`;
  return [
    {
      controlId: "AC-3",
      framework: "NIST SP 800-171",
      systemOfRecord: "ironframe-academic-sandbox",
      collectorId: "lab-collector-boundary",
      ingestTimestampUtc: now,
      scopeHash: "sha256:lab-scope-ac3-boundary",
      targetEnclave: FELLOWS_LAB_CLIENT_A,
      operatorSignOff: operator,
      verificationStatus: "VERIFIED",
      lossExposureCents: 12_500_00n,
    },
    {
      controlId: "SI-7",
      framework: "NIST SP 800-171",
      systemOfRecord: "ironframe-academic-sandbox",
      collectorId: "lab-collector-ingest",
      ingestTimestampUtc: now,
      scopeHash: "sha256:lab-scope-si7-quarantine",
      targetEnclave: FELLOWS_ACADEMIC_SANDBOX_ID,
      operatorSignOff: operator,
      verificationStatus: "QUARANTINED",
      lossExposureCents: 4_200_00n,
    },
    {
      controlId: "AU-2",
      framework: "SOC 2",
      systemOfRecord: "ironframe-academic-sandbox",
      collectorId: "lab-collector-lineage",
      ingestTimestampUtc: now,
      scopeHash: "sha256:lab-scope-au2-lineage",
      targetEnclave: FELLOWS_LAB_CLIENT_A,
      operatorSignOff: operator,
      verificationStatus: "VERIFIED",
      lossExposureCents: 890_00n,
    },
  ];
}
