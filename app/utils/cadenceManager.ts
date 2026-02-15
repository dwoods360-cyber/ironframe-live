import {
  DEFAULT_VENDOR_EVIDENCE_REQUEST_TEMPLATE,
  type CadenceAlertToggles,
  type CompanyStakeholder,
} from "@/app/store/systemConfigStore";
import {
  getOutboundMailLog,
  sendStakeholderCadenceEscalation,
  sendVendorDocumentUpdateRequest,
  sendVendorUpcomingExpirationReminder,
} from "@/app/utils/mailHub";
import { type VendorRecord, getDaysUntilExpiration, resolveCadenceStatus } from "@/app/vendors/schema";

type CadenceDispatchConfig = {
  cadenceAlerts: CadenceAlertToggles;
  companyStakeholders: CompanyStakeholder[];
  vendorDocumentUpdateTemplate: string;
};

type CadenceDispatchEvent = {
  vendorName: string;
  milestone: "90" | "60" | "30";
  recipientTitles: string[];
};

export type CadenceDispatchResult = {
  vendors: VendorRecord[];
  dispatchedEvents: CadenceDispatchEvent[];
};

function hasMilestoneRecord(vendorName: string, milestone: "90" | "60" | "30") {
  return getOutboundMailLog().some(
    (mail) =>
      mail.vendorName === vendorName &&
      mail.cadenceMilestone === milestone,
  );
}

function findEscalationStakeholders(stakeholders: CompanyStakeholder[]) {
  const ciso = stakeholders.find(
    (stakeholder) =>
      stakeholder.email.trim().length > 0 &&
      stakeholder.title.toLowerCase().includes("ciso"),
  );

  const legalCounsel = stakeholders.find(
    (stakeholder) => {
      if (stakeholder.email.trim().length === 0) {
        return false;
      }

      const normalizedTitle = stakeholder.title.toLowerCase();
      return normalizedTitle.includes("general counsel") || normalizedTitle.includes("legal counsel");
    },
  );

  return { ciso, legalCounsel };
}

export function dispatchCadenceEscalations(vendors: VendorRecord[], config: CadenceDispatchConfig, nowMs = Date.now()) {
  const template = config.vendorDocumentUpdateTemplate.trim() || DEFAULT_VENDOR_EVIDENCE_REQUEST_TEMPLATE;
  const dispatchedEvents: CadenceDispatchEvent[] = [];

  const nextVendors = vendors.map((vendor) => {
    const daysUntilExpiration = getDaysUntilExpiration(vendor.documentExpirationDate, nowMs);
    const currentCadence = resolveCadenceStatus(daysUntilExpiration);
    let lastRequestSent = vendor.lastRequestSent;

    if (config.cadenceAlerts.day90 && daysUntilExpiration <= 90 && daysUntilExpiration > 60 && !hasMilestoneRecord(vendor.vendorName, "90")) {
      const vendorEmail = `${vendor.vendorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}@vendors.ironframe.local`;
      const reminder = sendVendorUpcomingExpirationReminder(vendor.vendorName, vendorEmail, daysUntilExpiration);
      lastRequestSent = reminder.sentAt;
      dispatchedEvents.push({
        vendorName: vendor.vendorName,
        milestone: "90",
        recipientTitles: ["Vendor Compliance Contact"],
      });
    }

    if (config.cadenceAlerts.day60 && daysUntilExpiration <= 60 && daysUntilExpiration > 30 && !hasMilestoneRecord(vendor.vendorName, "60")) {
      const vendorEmail = `${vendor.vendorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}@vendors.ironframe.local`;
      const evidenceRequest = sendVendorDocumentUpdateRequest(vendor.vendorName, vendorEmail, template, {
        cadenceMilestone: "60",
        priority: "NORMAL",
      });
      lastRequestSent = evidenceRequest.sentAt;
      dispatchedEvents.push({
        vendorName: vendor.vendorName,
        milestone: "60",
        recipientTitles: ["Vendor Compliance Contact"],
      });
    }

    if (config.cadenceAlerts.day30 && daysUntilExpiration <= 30 && daysUntilExpiration > 0 && !hasMilestoneRecord(vendor.vendorName, "30")) {
      const { ciso, legalCounsel } = findEscalationStakeholders(config.companyStakeholders);

      if (ciso) {
        const cisoMail = sendStakeholderCadenceEscalation({
          recipientEmail: ciso.email,
          recipientTitle: ciso.title,
          vendorName: vendor.vendorName,
          daysUntilExpiration,
          priority: "HIGH",
          requireReadReceipt: true,
        });
        lastRequestSent = cisoMail.sentAt;
        dispatchedEvents.push({
          vendorName: vendor.vendorName,
          milestone: "30",
          recipientTitles: [ciso.title],
        });
      }

      if (legalCounsel) {
        const legalMail = sendStakeholderCadenceEscalation({
          recipientEmail: legalCounsel.email,
          recipientTitle: legalCounsel.title,
          vendorName: vendor.vendorName,
          daysUntilExpiration,
          priority: "HIGH",
          requireReadReceipt: true,
        });
        lastRequestSent = legalMail.sentAt;
        dispatchedEvents.push({
          vendorName: vendor.vendorName,
          milestone: "30",
          recipientTitles: [legalCounsel.title],
        });
      }
    }

    return {
      ...vendor,
      currentCadence,
      lastRequestSent,
    };
  });

  return {
    vendors: nextVendors,
    dispatchedEvents,
  } satisfies CadenceDispatchResult;
}
