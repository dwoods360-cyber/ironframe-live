"use client";

import { useSyncExternalStore } from "react";
import { archiveAndVersionDocument } from "@/utils/versioning";

export type EvidenceStatus = "VERIFIED" | "PENDING SIGNATURE";

export type EvidenceEntry = {
  id: string;
  name: string;
  entity: "MEDSHIELD" | "VAULTBANK" | "GRIDCORE";
  hash: string;
  timestamp: string;
  status: EvidenceStatus;
  storagePath?: string;
  vendorId?: string;
  documentType?: string;
  expirationDate?: string;
};

type EvidenceInput = Omit<EvidenceEntry, "id">;

const listeners = new Set<() => void>();

let evidenceState: EvidenceEntry[] = [
  {
    id: "ev-1",
    name: "HIPAA_Audit_Q1.pdf",
    entity: "MEDSHIELD",
    hash: "0x4F...3B",
    timestamp: "2026-02-14",
    status: "VERIFIED",
  },
  {
    id: "ev-2",
    name: "PCI_DSS_Compliance.pdf",
    entity: "VAULTBANK",
    hash: "0x8A...1C",
    timestamp: "2026-02-13",
    status: "PENDING SIGNATURE",
  },
];

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function subscribeEvidence(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getEvidenceSnapshot() {
  return evidenceState;
}

export function addEvidenceEntry(input: EvidenceInput) {
  const evidence: EvidenceEntry = {
    id: `ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...input,
  };

  evidenceState = [evidence, ...evidenceState];
  emitChange();
  return evidence;
}

function mapIndustryToEntity(industry: string): EvidenceEntry["entity"] {
  if (industry === "Healthcare") return "MEDSHIELD";
  if (industry === "Financial") return "VAULTBANK";
  return "GRIDCORE";
}

function makeHashToken() {
  const token = Math.floor(Math.random() * 0xfffff)
    .toString(16)
    .toUpperCase()
    .padStart(5, "0");
  const suffix = Math.floor(Math.random() * 0xff)
    .toString(16)
    .toUpperCase()
    .padStart(2, "0");
  return `0x${token.slice(0, 2)}...${suffix}`;
}

export function createEvidenceFromReport(reportName: string, industry: string) {
  const normalizedName = reportName.replace(/\s+/g, "_");

  return addEvidenceEntry({
    name: `${normalizedName}.pdf`,
    entity: mapIndustryToEntity(industry),
    hash: makeHashToken(),
    timestamp: new Date().toISOString().slice(0, 10),
    status: "VERIFIED",
  });
}

type VendorEvidenceInput = {
  fileName: string;
  entity: EvidenceEntry["entity"];
  vendorId: string;
  documentType: string;
  expirationDate: string;
};

export function addVendorEvidenceEntry(input: VendorEvidenceInput) {
  return addEvidenceEntry({
    name: input.fileName,
    entity: input.entity,
    hash: makeHashToken(),
    timestamp: new Date().toISOString().slice(0, 10),
    status: "VERIFIED",
    storagePath: `/evidence/vendors/${input.vendorId}/${input.fileName}`,
    vendorId: input.vendorId,
    documentType: input.documentType,
    expirationDate: input.expirationDate,
  });
}

type VersionVendorEvidenceInput = {
  vendorId: string;
  documentType: string;
  incomingFileName: string;
  entity: EvidenceEntry["entity"];
};

export function versionVendorEvidenceEntry(input: VersionVendorEvidenceInput) {
  const existing = evidenceState.find(
    (entry) => entry.vendorId === input.vendorId && entry.documentType === input.documentType,
  );

  if (!existing || !existing.storagePath) {
    return addVendorEvidenceEntry({
      fileName: input.incomingFileName,
      entity: input.entity,
      vendorId: input.vendorId,
      documentType: input.documentType,
      expirationDate: "",
    });
  }

  const versioning = archiveAndVersionDocument(existing.storagePath, input.incomingFileName);

  evidenceState = evidenceState.map((entry) =>
    entry.id === existing.id
      ? {
          ...entry,
          status: "PENDING SIGNATURE",
          storagePath: versioning.archivedPath,
        }
      : entry,
  );

  const next = addEvidenceEntry({
    name: versioning.versionedFileName,
    entity: input.entity,
    hash: makeHashToken(),
    timestamp: new Date().toISOString().slice(0, 10),
    status: "VERIFIED",
    storagePath: `/evidence/vendors/${input.vendorId}/${versioning.versionedFileName}`,
    vendorId: input.vendorId,
    documentType: input.documentType,
    expirationDate: existing.expirationDate ?? "",
  });

  return {
    archivedPath: versioning.archivedPath,
    versionedFileName: versioning.versionedFileName,
    versionNumber: versioning.versionNumber,
    entry: next,
  };
}

export function useEvidenceStore() {
  return useSyncExternalStore(subscribeEvidence, getEvidenceSnapshot, getEvidenceSnapshot);
}
