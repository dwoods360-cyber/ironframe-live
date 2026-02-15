"use client";

import { useSyncExternalStore } from "react";
import { appendAuditLog, ensureLoginAuditEvent } from "@/app/utils/auditLogger";
import { VendorType } from "@/app/vendors/schema";

export const DEFAULT_VENDOR_EVIDENCE_REQUEST_TEMPLATE =
  "NIST 800-53 Evidence Request: Please provide updated control evidence, attestation artifacts, and remediation status for your assigned controls within 48 hours.";

export type CompanyStakeholder = {
  id: string;
  name: string;
  title: string;
  email: string;
  department: string;
  includeReadReceipt: boolean;
  readReceiptLog: string[];
};

export type AdhocNotificationGroup = {
  id: string;
  name: string;
  emails: string;
  includeReadReceipt: boolean;
};

export type CadenceAlertToggles = {
  day90: boolean;
  day60: boolean;
  day30: boolean;
};

export type VendorTypeRequirements = Record<VendorType, string[]>;

type SystemConfigState = {
  socEmailIntakeEnabled: boolean;
  socDepartmentEmail: string;
  socAutoReceiptEnabled: boolean;
  authorizedSocDomains: string[];
  companyStakeholders: CompanyStakeholder[];
  vendorDocumentUpdateTemplate: string;
  adhocNotificationGroups: AdhocNotificationGroup[];
  cadenceAlerts: CadenceAlertToggles;
  generalRfiChecklist: string[];
  vendorTypeRequirements: VendorTypeRequirements;
};

const STORAGE_KEY = "ironframe-system-config-v1";

const listeners = new Set<() => void>();

const DEFAULT_STAKEHOLDERS: CompanyStakeholder[] = [
  {
    id: "stakeholder-1",
    name: "",
    title: "CISO",
    email: "",
    department: "Security",
    includeReadReceipt: false,
    readReceiptLog: [],
  },
  {
    id: "stakeholder-2",
    name: "",
    title: "CRO",
    email: "",
    department: "Risk",
    includeReadReceipt: false,
    readReceiptLog: [],
  },
  {
    id: "stakeholder-3",
    name: "",
    title: "DPO",
    email: "",
    department: "Privacy",
    includeReadReceipt: false,
    readReceiptLog: [],
  },
  {
    id: "stakeholder-4",
    name: "",
    title: "CFO",
    email: "",
    department: "Finance",
    includeReadReceipt: false,
    readReceiptLog: [],
  },
  {
    id: "stakeholder-5",
    name: "",
    title: "General Counsel",
    email: "",
    department: "Legal",
    includeReadReceipt: false,
    readReceiptLog: [],
  },
  {
    id: "stakeholder-6",
    name: "",
    title: "Head of ITSM",
    email: "",
    department: "IT Operations",
    includeReadReceipt: false,
    readReceiptLog: [],
  },
  {
    id: "stakeholder-7",
    name: "",
    title: "Head of Product Security",
    email: "",
    department: "Product Security",
    includeReadReceipt: false,
    readReceiptLog: [],
  },
  {
    id: "stakeholder-8",
    name: "",
    title: "Audit Director",
    email: "",
    department: "Internal Audit",
    includeReadReceipt: false,
    readReceiptLog: [],
  },
];

const DEFAULT_ADHOC_GROUPS: AdhocNotificationGroup[] = [
  {
    id: "group-1",
    name: "",
    emails: "",
    includeReadReceipt: false,
  },
  {
    id: "group-2",
    name: "",
    emails: "",
    includeReadReceipt: false,
  },
  {
    id: "group-3",
    name: "",
    emails: "",
    includeReadReceipt: false,
  },
];

const DEFAULT_GENERAL_RFI_CHECKLIST = ["Privacy Policy", "Insurance", "Pen Test", "Disaster Recovery"];

const DEFAULT_VENDOR_TYPE_REQUIREMENTS: VendorTypeRequirements = {
  SaaS: ["SOC2", "Privacy Policy"],
  "On-Prem Software": ["ISO 27001", "Vulnerability Scan Report"],
  "Managed Services": ["SOC2", "Business Continuity Plan", "Incident Response Plan"],
  Hardware: ["NIST 800-161", "ISO 9001"],
};

let systemConfigState: SystemConfigState = {
  socEmailIntakeEnabled: false,
  socDepartmentEmail: "",
  socAutoReceiptEnabled: false,
  authorizedSocDomains: ["medshield.com"],
  companyStakeholders: DEFAULT_STAKEHOLDERS,
  vendorDocumentUpdateTemplate: DEFAULT_VENDOR_EVIDENCE_REQUEST_TEMPLATE,
  adhocNotificationGroups: DEFAULT_ADHOC_GROUPS,
  cadenceAlerts: {
    day90: true,
    day60: true,
    day30: true,
  },
  generalRfiChecklist: DEFAULT_GENERAL_RFI_CHECKLIST,
  vendorTypeRequirements: DEFAULT_VENDOR_TYPE_REQUIREMENTS,
};

function emitChange() {
  listeners.forEach((listener) => listener());
}

function sanitizeDomains(input: string[]) {
  return Array.from(
    new Set(
      input
        .map((entry) => entry.trim().toLowerCase())
        .filter((entry) => entry.length > 0)
        .map((entry) => entry.replace(/^@/, "")),
    ),
  );
}

function sanitizeStakeholders(input: CompanyStakeholder[] | undefined) {
  if (!input || input.length === 0) {
    return DEFAULT_STAKEHOLDERS;
  }

  const parsed = input.slice(0, 20).map((stakeholder, index) => ({
    id: stakeholder.id || `stakeholder-${index + 1}`,
    name: stakeholder.name?.trim() ?? "",
    title: stakeholder.title?.trim() ?? "",
    email: stakeholder.email?.trim() ?? "",
    department: stakeholder.department?.trim() ?? "",
    includeReadReceipt: Boolean(stakeholder.includeReadReceipt),
    readReceiptLog: Array.isArray(stakeholder.readReceiptLog)
      ? stakeholder.readReceiptLog
          .map((entry) => String(entry).trim())
          .filter((entry) => entry.length > 0)
      : [],
  }));

  return parsed.length >= 8 ? parsed : [...parsed, ...DEFAULT_STAKEHOLDERS.slice(parsed.length, 8)];
}

function sanitizeAdhocGroups(input: AdhocNotificationGroup[] | undefined) {
  const fallback = DEFAULT_ADHOC_GROUPS;

  if (!input || input.length === 0) {
    return fallback;
  }

  const parsed = input.slice(0, 3).map((group, index) => ({
    id: group.id || `group-${index + 1}`,
    name: group.name?.trim() ?? "",
    emails: group.emails?.trim() ?? "",
    includeReadReceipt: Boolean(group.includeReadReceipt),
  }));

  while (parsed.length < 3) {
    parsed.push(fallback[parsed.length]);
  }

  return parsed;
}

function sanitizeCadenceAlerts(input: Partial<CadenceAlertToggles> | undefined): CadenceAlertToggles {
  return {
    day90: input?.day90 ?? true,
    day60: input?.day60 ?? true,
    day30: input?.day30 ?? true,
  };
}

function sanitizeChecklist(input: string[] | undefined) {
  const parsed = (input ?? [])
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (parsed.length === 0) {
    return DEFAULT_GENERAL_RFI_CHECKLIST;
  }

  return Array.from(new Set(parsed));
}

function sanitizeVendorTypeRequirements(input: Partial<VendorTypeRequirements> | undefined): VendorTypeRequirements {
  const source = input ?? {};
  return {
    SaaS: sanitizeChecklist(source.SaaS),
    "On-Prem Software": sanitizeChecklist(source["On-Prem Software"]),
    "Managed Services": sanitizeChecklist(source["Managed Services"]),
    Hardware: sanitizeChecklist(source.Hardware),
  };
}

export function hydrateSystemConfig() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Partial<SystemConfigState>;
    systemConfigState = {
      socEmailIntakeEnabled: parsed.socEmailIntakeEnabled ?? false,
      socDepartmentEmail: parsed.socDepartmentEmail?.trim() ?? "",
      socAutoReceiptEnabled: parsed.socAutoReceiptEnabled ?? false,
      authorizedSocDomains: sanitizeDomains(parsed.authorizedSocDomains ?? []),
      companyStakeholders: sanitizeStakeholders(parsed.companyStakeholders),
      vendorDocumentUpdateTemplate:
        parsed.vendorDocumentUpdateTemplate?.trim() ||
        DEFAULT_VENDOR_EVIDENCE_REQUEST_TEMPLATE,
      adhocNotificationGroups: sanitizeAdhocGroups(parsed.adhocNotificationGroups),
      cadenceAlerts: sanitizeCadenceAlerts(parsed.cadenceAlerts),
      generalRfiChecklist: sanitizeChecklist(parsed.generalRfiChecklist),
      vendorTypeRequirements: sanitizeVendorTypeRequirements(parsed.vendorTypeRequirements),
    };
    emitChange();
    ensureLoginAuditEvent();
  } catch {
    // no-op
  }
}

function persistSystemConfig() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(systemConfigState));
}

export function subscribeSystemConfig(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSystemConfigSnapshot() {
  return systemConfigState;
}

export function setSocEmailIntakeEnabled(enabled: boolean) {
  systemConfigState = {
    ...systemConfigState,
    socEmailIntakeEnabled: enabled,
  };
  persistSystemConfig();
  emitChange();
}

export function setSocDepartmentEmail(email: string) {
  const value = email.trim();
  systemConfigState = {
    ...systemConfigState,
    socDepartmentEmail: value,
  };
  appendAuditLog({
    action_type: "CONFIG_CHANGE",
    log_type: "GRC",
    metadata_tag: "GRC_GOVERNANCE",
    description: `SOC department email updated to ${value || "(empty)"}.`,
  });
  persistSystemConfig();
  emitChange();
}

export function setSocAutoReceiptEnabled(enabled: boolean) {
  systemConfigState = {
    ...systemConfigState,
    socAutoReceiptEnabled: enabled,
  };
  persistSystemConfig();
  emitChange();
}

export function setAuthorizedSocDomains(domains: string[]) {
  systemConfigState = {
    ...systemConfigState,
    authorizedSocDomains: sanitizeDomains(domains),
  };
  persistSystemConfig();
  emitChange();
}

export function setCompanyStakeholders(stakeholders: CompanyStakeholder[]) {
  const sanitized = sanitizeStakeholders(stakeholders);
  systemConfigState = {
    ...systemConfigState,
    companyStakeholders: sanitized,
  };
  appendAuditLog({
    action_type: "CONFIG_CHANGE",
    log_type: "GRC",
    metadata_tag: "GRC_GOVERNANCE",
    description: `Stakeholder table saved (${sanitized.filter((entry) => entry.email.length > 0).length} email targets configured).`,
  });
  persistSystemConfig();
  emitChange();
}

export function setVendorDocumentUpdateTemplate(template: string) {
  const value = template.trim();
  systemConfigState = {
    ...systemConfigState,
    vendorDocumentUpdateTemplate: value,
  };
  appendAuditLog({
    action_type: "CONFIG_CHANGE",
    log_type: "GRC",
    metadata_tag: "GRC_GOVERNANCE",
    description: `Vendor evidence template updated (${value.length} chars).`,
  });
  persistSystemConfig();
  emitChange();
}

export function setAdhocNotificationGroups(groups: AdhocNotificationGroup[]) {
  systemConfigState = {
    ...systemConfigState,
    adhocNotificationGroups: sanitizeAdhocGroups(groups),
  };
  persistSystemConfig();
  emitChange();
}

export function setCadenceAlerts(cadenceAlerts: Partial<CadenceAlertToggles>) {
  systemConfigState = {
    ...systemConfigState,
    cadenceAlerts: sanitizeCadenceAlerts(cadenceAlerts),
  };
  persistSystemConfig();
  emitChange();
}

export function setGeneralRfiChecklist(checklist: string[]) {
  const sanitized = sanitizeChecklist(checklist);
  systemConfigState = {
    ...systemConfigState,
    generalRfiChecklist: sanitized,
  };
  appendAuditLog({
    action_type: "CONFIG_CHANGE",
    log_type: "GRC",
    metadata_tag: "GRC_GOVERNANCE",
    description: `General RFI checklist updated (${sanitized.length} items).`,
  });
  persistSystemConfig();
  emitChange();
}

export function setVendorTypeRequirements(requirements: VendorTypeRequirements) {
  const sanitized = sanitizeVendorTypeRequirements(requirements);
  systemConfigState = {
    ...systemConfigState,
    vendorTypeRequirements: sanitized,
  };
  appendAuditLog({
    action_type: "CONFIG_CHANGE",
    log_type: "GRC",
    metadata_tag: "GRC_GOVERNANCE",
    description: "Vendor type evidence requirements updated.",
  });
  persistSystemConfig();
  emitChange();
}

export function useSystemConfigStore() {
  return useSyncExternalStore(subscribeSystemConfig, getSystemConfigSnapshot, getSystemConfigSnapshot);
}
