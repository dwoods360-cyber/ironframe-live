"use client";

import { CompanyStakeholder, VendorTypeRequirements } from "@/app/store/systemConfigStore";
import { VendorType } from "@/app/vendors/schema";

const INTERNAL_OWNER_EMAIL_BY_ENTITY: Record<string, string> = {
  MEDSHIELD: "medshield-owner@ironframe.local",
  VAULTBANK: "vaultbank-owner@ironframe.local",
  GRIDCORE: "gridcore-owner@ironframe.local",
};

type DocumentGapContext = {
  soc2Status: "Active" | "Expired";
  soc2ExpirationDate: string;
  evidenceLockerDocs: string[];
  vendorType: VendorType;
  industry?: "Healthcare" | "Finance" | "Energy";
};

export function useVendorActions(stakeholders: CompanyStakeholder[], vendorTypeRequirements: VendorTypeRequirements) {
  const resolveInternalStakeholderEmail = (associatedEntity: string) => {
    const normalizedEntity = associatedEntity.trim().toUpperCase();
    const matchedStakeholder = stakeholders.find((stakeholder) => {
      if (!stakeholder.email.trim()) {
        return false;
      }

      const title = stakeholder.title.toLowerCase();
      const department = stakeholder.department.toLowerCase();
      const name = stakeholder.name.toLowerCase();
      const entityLower = normalizedEntity.toLowerCase();

      return title.includes(entityLower) || department.includes(entityLower) || name.includes(entityLower);
    });

    if (matchedStakeholder?.email.trim()) {
      return matchedStakeholder.email.trim();
    }

    return INTERNAL_OWNER_EMAIL_BY_ENTITY[normalizedEntity] || "grc-operations@ironframe.local";
  };

  const buildDocumentGapSummary = (context: DocumentGapContext) => {
    const requiredDocuments = vendorTypeRequirements[context.vendorType] ?? ["SOC2"];
    const missingDocuments = requiredDocuments.filter((documentName) => !context.evidenceLockerDocs.includes(documentName));

    const normalizedMissing = missingDocuments.map((documentName) =>
      documentName === "ISO 27001" ? "Pending ISO 27001 renewal" : `Missing ${documentName}`,
    );

    const documentGaps = [
      ...(context.soc2Status === "Expired" ? [`Expired SOC2 (${context.soc2ExpirationDate})`] : []),
      ...normalizedMissing,
    ];

    return documentGaps.length > 0 ? documentGaps.join("; ") : "No critical gaps detected";
  };

  return {
    resolveInternalStakeholderEmail,
    vendorProfiles: vendorTypeRequirements,
    buildDocumentGapSummary,
  };
}
