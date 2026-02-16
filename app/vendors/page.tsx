"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, MoreVertical, Plus, Search } from "lucide-react";
import NotificationHub from "@/app/components/NotificationHub";
import { appendAuditLog } from "@/app/utils/auditLogger";
import { logReadReceipt, sendVendorDocumentUpdateRequest } from "@/app/utils/mailHub";
import { dispatchCadenceEscalations } from "@/app/utils/cadenceManager";
import { addVendorEvidenceEntry, useEvidenceStore, versionVendorEvidenceEntry } from "@/app/store/evidenceStore";
import { DEFAULT_VENDOR_EVIDENCE_REQUEST_TEMPLATE, useSystemConfigStore } from "@/app/store/systemConfigStore";
import { useVendorActions } from "@/app/hooks/useVendorActions";
import AddVendorModal, { AddVendorSubmission } from "@/app/vendors/AddVendorModal";
import RFITemplate from "@/app/vendors/RFITemplate";
import Visualizer from "@/app/vendors/Visualizer";
import ScorecardIcon from "@/app/vendors/ScorecardIcon";
import RiskSparkbar from "@/app/vendors/RiskSparkbar";
import { MonitoringAlert, startMonitoringAgent } from "@/services/monitoringAgent";
import { getWeeklySummaryMetrics, incrementArchivedLowPriority, incrementRemediatedHighRisk, WeeklySummaryMetrics } from "@/services/weeklySummaryService";
import { Industry, MASTER_VENDORS, RiskTier, VendorRecord, VendorType, getDaysUntilExpiration } from "@/app/vendors/schema";
import { calculateVendorGrade, VendorLetterGrade } from "@/utils/scoringEngine";

const RISK_TIER_STYLE: Record<RiskTier, string> = {
  CRITICAL: "text-red-300",
  HIGH: "text-amber-500",
  LOW: "text-emerald-300",
};

const GRADE_BADGE_STYLE: Record<VendorLetterGrade, string> = {
  A: "border-emerald-400/80 bg-emerald-500/15 text-emerald-300",
  B: "border-amber-400/80 bg-amber-500/15 text-amber-200",
  C: "border-amber-400/80 bg-amber-500/15 text-amber-200",
  D: "border-red-400/80 bg-red-500/15 text-red-300",
  F: "border-red-400/80 bg-red-500/15 text-red-300",
};

type RiskFilter = "ALL" | "HIGH" | "MED" | "LOW";
type ComplianceFilter = "ALL" | "EXPIRING_30" | "AUDIT_DUE" | "RECENTLY_ADDED";

const VENDOR_EVIDENCE_LOCKER: Record<string, string[]> = {
  "Azure Health": ["SOC2", "MSA", "Insurance"],
  Stripe: ["SOC2", "MSA", "Insurance"],
  SWIFT: ["SOC2", "MSA", "Insurance"],
  "Schneider Electric": ["SOC2", "MSA", "Insurance"],
  "GCP Cloud": ["SOC2", "MSA", "Insurance"],
  Twilio: ["SOC2", "MSA", "Insurance"],
  Crowdstrike: ["SOC2", "MSA", "Insurance"],
  ServiceNow: ["SOC2", "MSA", "Insurance"],
  "Palo Alto Networks": ["SOC2", "MSA", "Insurance"],
};

const VENDOR_CREATED_AT_DAYS_AGO: Record<string, number> = {
  "Azure Health": 12,
  Stripe: 16,
  SWIFT: 45,
  "Schneider Electric": 7,
  "GCP Cloud": 3,
  Twilio: 20,
  Crowdstrike: 31,
  ServiceNow: 5,
  "Palo Alto Networks": 60,
};

const RECENTLY_ADDED_WINDOW_DAYS = 14;
const VENDOR_ACTION_ITEMS = [
  "Quick-Notify CISO (SOC2 Expired)",
  "Email Vendor",
  "General RFI",
  "View Profile",
  "Initiate Audit Request",
  "Update Risk Level",
  "Upload New Evidence",
  "Notify Stakeholder",
  "Archive Vendor",
] as const;

type VendorActionItem = (typeof VENDOR_ACTION_ITEMS)[number];
type Soc2Status = "Active" | "Expired";
const NOTIFICATION_FLAG_STORAGE_KEY = "vendor-notification-sent-v1";

type VendorEmailContext = {
  associatedEntity: string;
  vendorType: VendorType;
  vendorId: string;
  soc2Status: Soc2Status;
  soc2ExpirationDate: string;
  evidenceLockerDocs: string[];
};

type InjectAlertDetail = {
  vendorName: string;
  documentType: string;
  source?: string;
};

export default function VendorsOverviewPage() {
  const MAX_SIMULATION_REQUESTS = 5;
  const systemConfig = useSystemConfigStore();
  const [vendors, setVendors] = useState<VendorRecord[]>(MASTER_VENDORS);
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<"ALL" | Industry>("ALL");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("ALL");
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>("ALL");
  const [view, setView] = useState<"TABLE" | "MAP">("TABLE");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastVendorMailId, setLastVendorMailId] = useState<string | null>(null);
  const [simulationRequests, setSimulationRequests] = useState(0);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [isAddVendorPulseActive, setIsAddVendorPulseActive] = useState(true);
  const [monitoringAlerts, setMonitoringAlerts] = useState<MonitoringAlert[]>([]);
  const [rfiTarget, setRfiTarget] = useState<{ vendorName: string; vendorEmail: string; internalStakeholderEmail: string } | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummaryMetrics>(() => getWeeklySummaryMetrics());
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const evidenceEntries = useEvidenceStore();
  const { resolveInternalStakeholderEmail, buildDocumentGapSummary } = useVendorActions(
    systemConfig.companyStakeholders,
    systemConfig.vendorTypeRequirements,
  );
  const [notificationSentVendors, setNotificationSentVendors] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") {
      return {};
    }

    try {
      const raw = window.localStorage.getItem(NOTIFICATION_FLAG_STORAGE_KEY);
      if (!raw) {
        return {};
      }

      return JSON.parse(raw) as Record<string, boolean>;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    window.localStorage.setItem(NOTIFICATION_FLAG_STORAGE_KEY, JSON.stringify(notificationSentVendors));
  }, [notificationSentVendors]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsAddVendorPulseActive(false);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const monitoredDocumentTypes = Array.from(
      new Set(Object.values(systemConfig.vendorTypeRequirements).flatMap((documents) => documents)),
    );

    const stop = startMonitoringAgent({
      vendorNames: vendors.map((vendor) => vendor.vendorName),
      monitoredDocumentTypes,
      onAlert: (alert) => {
        setMonitoringAlerts((current) => (current.some((item) => item.id === alert.id) ? current : [alert, ...current].slice(0, 6)));
      },
    });

    return stop;
  }, [systemConfig.vendorTypeRequirements, vendors]);

  useEffect(() => {
    const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const handleInjectedAlert = (event: Event) => {
      const customEvent = event as CustomEvent<InjectAlertDetail>;
      const vendorName = customEvent.detail?.vendorName?.trim();

      if (!vendorName) {
        return;
      }

      const documentType = customEvent.detail?.documentType?.trim() || "SOC2";
      const dateToken = new Date().toISOString().slice(0, 10);
      const suggestedFileName = `${slugify(vendorName)}_${slugify(documentType)}_${dateToken}.pdf`;

      setMonitoringAlerts((current) => [
        {
          id: `inject-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          vendorName,
          documentType,
          source: customEvent.detail?.source || "Simulated Monitoring Feed",
          discoveredAt: new Date().toISOString(),
          suggestedFileName,
        },
        ...current,
      ]);
    };

    const handleResetAlerts = () => {
      setMonitoringAlerts([]);
    };

    window.addEventListener("monitoring:inject-alert", handleInjectedAlert as EventListener);
    window.addEventListener("monitoring:reset-alerts", handleResetAlerts);
    return () => {
      window.removeEventListener("monitoring:inject-alert", handleInjectedAlert as EventListener);
      window.removeEventListener("monitoring:reset-alerts", handleResetAlerts);
    };
  }, []);

  useEffect(() => {
    const handleOpenAddVendor = () => {
      setIsAddVendorModalOpen(true);
    };

    window.addEventListener("vendors:open-add-vendor", handleOpenAddVendor);
    return () => window.removeEventListener("vendors:open-add-vendor", handleOpenAddVendor);
  }, []);

  useEffect(() => {
    const handleOpenSummary = () => {
      setWeeklySummary(getWeeklySummaryMetrics());
      setIsSummaryOpen(true);
    };

    window.addEventListener("vendors:open-summary", handleOpenSummary);
    return () => window.removeEventListener("vendors:open-summary", handleOpenSummary);
  }, []);

  const vendorsWithCadence = useMemo(() => {
    const result = dispatchCadenceEscalations(vendors, {
      cadenceAlerts: systemConfig.cadenceAlerts,
      companyStakeholders: systemConfig.companyStakeholders,
      vendorDocumentUpdateTemplate: systemConfig.vendorDocumentUpdateTemplate,
    });

    return result.vendors;
  }, [systemConfig.cadenceAlerts, systemConfig.companyStakeholders, systemConfig.vendorDocumentUpdateTemplate, vendors]);

  const filteredVendors = useMemo(() => {
    return vendorsWithCadence.filter((vendor) => {
      const matchesIndustry = industry === "ALL" || vendor.industry === industry;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        vendor.vendorName.toLowerCase().includes(query) ||
        vendor.associatedEntity.toLowerCase().includes(query) ||
        vendor.contractStatus.toLowerCase().includes(query);

      const daysUntilExpiration = getDaysUntilExpiration(vendor.documentExpirationDate);

      const matchesRisk =
        riskFilter === "ALL" ||
        (riskFilter === "HIGH" && vendor.riskTier === "CRITICAL") ||
        (riskFilter === "MED" && vendor.riskTier === "HIGH") ||
        (riskFilter === "LOW" && vendor.riskTier === "LOW");

      const recentlyAddedDaysAgo = VENDOR_CREATED_AT_DAYS_AGO[vendor.vendorName] ?? 999;
      const matchesComplianceCalendar =
        complianceFilter === "ALL" ||
        (complianceFilter === "EXPIRING_30" && daysUntilExpiration > 0 && daysUntilExpiration < 30) ||
        (complianceFilter === "AUDIT_DUE" && (vendor.currentCadence === "30" || vendor.currentCadence === "OVERDUE")) ||
        (complianceFilter === "RECENTLY_ADDED" && recentlyAddedDaysAgo <= RECENTLY_ADDED_WINDOW_DAYS);

      return matchesIndustry && matchesSearch && matchesRisk && matchesComplianceCalendar;
    });
  }, [complianceFilter, industry, riskFilter, search, vendorsWithCadence]);

  const vendorGraph = useMemo(() => {
    const pendingVersioningByVendorId = evidenceEntries.reduce<Record<string, boolean>>((acc, entry) => {
      if (entry.vendorId && entry.status === "PENDING SIGNATURE") {
        acc[entry.vendorId] = true;
      }
      return acc;
    }, {});

    const activeAlertCountByVendor = monitoringAlerts.reduce<Record<string, number>>((acc, alert) => {
      acc[alert.vendorName] = (acc[alert.vendorName] ?? 0) + 1;
      return acc;
    }, {});

    return filteredVendors.map((vendor) => {
      const hasBreachedSubProcessor = vendor.criticalSubProcessors.some((processor) => processor.status === "BREACH");
      const cascadedRiskTier: RiskTier = hasBreachedSubProcessor ? "CRITICAL" : vendor.riskTier;
      const cascadedContractStatus = hasBreachedSubProcessor ? "CASCADED RED ALERT" : vendor.contractStatus;
      const vendorId = vendor.vendorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const daysUntilExpiration = getDaysUntilExpiration(vendor.documentExpirationDate);
      const evidenceLockerDocs = VENDOR_EVIDENCE_LOCKER[vendor.vendorName] ?? [];
      const healthScore = calculateVendorGrade({
        daysUntilSoc2Expiration: daysUntilExpiration,
        evidenceLockerDocs,
        hasActiveIndustryAlert: (activeAlertCountByVendor[vendor.vendorName] ?? 0) > 0,
        hasActiveBreachAlert: hasBreachedSubProcessor,
        hasPendingVersioning: Boolean(pendingVersioningByVendorId[vendorId]),
        hasStakeholderEscalation: Boolean(notificationSentVendors[vendor.vendorName]) || vendor.currentCadence === "30" || vendor.currentCadence === "OVERDUE",
        requiresManualReview:
          vendor.contractStatus.toUpperCase().includes("VIOLATION") ||
          vendor.contractStatus.toUpperCase().includes("DUE DILIGENCE"),
      });

      return {
        ...vendor,
        vendorId,
        vendorType: vendor.vendorType ?? "SaaS",
        cascadedRiskTier,
        cascadedContractStatus,
        hasBreachedSubProcessor,
        daysUntilExpiration,
        evidenceLockerDocs,
        createdDaysAgo: VENDOR_CREATED_AT_DAYS_AGO[vendor.vendorName] ?? 365,
        lastAuditDate: vendor.lastRequestSent ? vendor.lastRequestSent.slice(0, 10) : "N/A",
        soc2Status: daysUntilExpiration <= 0 ? "Expired" : "Active" as Soc2Status,
        soc2ExpirationDate: vendor.documentExpirationDate.slice(0, 10),
        notificationSent: Boolean(notificationSentVendors[vendor.vendorName]),
        healthScore,
      };
    });
  }, [evidenceEntries, filteredVendors, monitoringAlerts, notificationSentVendors]);

  const selectedVendor = useMemo(
    () => vendorGraph.find((vendor) => vendor.vendorId === selectedVendorId) ?? null,
    [selectedVendorId, vendorGraph],
  );

  const selectedVendorHistory = useMemo(() => {
    if (!selectedVendorId) {
      return [];
    }

    return evidenceEntries
      .filter((entry) => entry.vendorId === selectedVendorId)
      .slice()
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  }, [evidenceEntries, selectedVendorId]);

  const vendorRiskByName = useMemo(() => {
    return vendorsWithCadence.reduce<Record<string, RiskTier>>((acc, vendor) => {
      const hasBreachedSubProcessor = vendor.criticalSubProcessors.some((processor) => processor.status === "BREACH");
      acc[vendor.vendorName] = hasBreachedSubProcessor ? "CRITICAL" : vendor.riskTier;
      return acc;
    }, {});
  }, [vendorsWithCadence]);

  const vendorIdByName = useMemo(
    () =>
      vendorsWithCadence.reduce<Record<string, string>>((acc, vendor) => {
        acc[vendor.vendorName] = vendor.vendorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return acc;
      }, {}),
    [vendorsWithCadence],
  );

  const activeNotificationVendorIds = useMemo(
    () =>
      Array.from(
        new Set(
          monitoringAlerts
            .map((alert) => vendorIdByName[alert.vendorName])
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [monitoringAlerts, vendorIdByName],
  );

  const resolveAlertRiskTier = (vendorName: string): RiskTier => vendorRiskByName[vendorName] ?? "LOW";

  const handleArchiveLowPriorityAlerts = (alertIds: string[]) => {
    if (alertIds.length === 0) {
      return;
    }

    const targetIds = new Set(alertIds);
    setMonitoringAlerts((current) => current.filter((alert) => !targetIds.has(alert.id)));
    setWeeklySummary(incrementArchivedLowPriority(alertIds.length));
    setStatusMessage(`Archived ${alertIds.length} low-priority/informational alerts. High-priority alerts remain active.`);
  };

  const getCountdownClassName = (daysUntilExpiration: number) => {
    if (daysUntilExpiration > 60) {
      return "text-emerald-300";
    }

    if (daysUntilExpiration > 30) {
      return "text-amber-300";
    }

    return "text-red-300";
  };

  const getCountdownLabel = (daysUntilExpiration: number) => {
    if (daysUntilExpiration <= 0) {
      return `Expired ${Math.abs(daysUntilExpiration)} day(s) ago`;
    }

    return `Expires in ${daysUntilExpiration} day(s)`;
  };

  const getCadenceLabel = (cadence: VendorRecord["currentCadence"]) => {
    if (cadence === "OVERDUE") {
      return "Escalation Engine: Overdue";
    }

    return `Escalation Engine: ${cadence}-Day Queue`;
  };

  const getRiskTrendPoints = (vendor: {
    daysUntilExpiration: number;
    healthScore: { score: number };
    cascadedRiskTier: RiskTier;
  }) => {
    const score = vendor.healthScore.score;
    const riskPressure = vendor.cascadedRiskTier === "CRITICAL" ? 4 : vendor.cascadedRiskTier === "HIGH" ? 2 : 0;
    const expiryPressure = vendor.daysUntilExpiration <= 0 ? 4 : vendor.daysUntilExpiration < 30 ? 2 : vendor.daysUntilExpiration < 60 ? 1 : 0;
    const baseline = Math.max(40, Math.min(98, score - riskPressure - expiryPressure));

    return [
      Math.max(24, baseline - 6),
      Math.max(24, baseline - 4),
      Math.max(24, baseline - 3),
      baseline,
      Math.min(100, baseline + 1),
      Math.min(100, baseline + 3),
      Math.min(100, score),
    ];
  };

  const getRecentStatusChangeLabel = (vendor: {
    soc2Status: Soc2Status;
    daysUntilExpiration: number;
    currentCadence: VendorRecord["currentCadence"];
    cascadedRiskTier: RiskTier;
    notificationSent: boolean;
  }) => {
    if (vendor.soc2Status === "Expired" || vendor.daysUntilExpiration <= 0) {
      return "SOC2 Type II Overdue";
    }

    if (vendor.cascadedRiskTier === "LOW" && vendor.daysUntilExpiration > 60) {
      return "ISO 27001 Renewed";
    }

    if (vendor.currentCadence === "OVERDUE") {
      return "Escalation Overdue";
    }

    if (vendor.currentCadence === "30") {
      return "Audit Window Opening";
    }

    if (vendor.notificationSent) {
      return "Stakeholder Notice Sent";
    }

    return "Status Stable";
  };

  const scrollToSecurityRatingColumn = () => {
    if (typeof window === "undefined") {
      return;
    }

    const target = document.querySelector('[data-testid="security-rating-header"]') as HTMLElement | null;
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  const toVendorEmail = (vendorName: string) => {
    const normalized = vendorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${normalized}@vendors.ironframe.local`;
  };

  const mapIndustryToEntity = (industryInput: Industry) => {
    if (industryInput === "Healthcare") {
      return "MEDSHIELD";
    }

    if (industryInput === "Finance") {
      return "VAULTBANK";
    }

    return "GRIDCORE";
  };

  const createSecurityRating = (riskTier: RiskTier) => {
    if (riskTier === "CRITICAL") {
      return "78/100";
    }

    if (riskTier === "HIGH") {
      return "84/100";
    }

    return "92/100";
  };

  const handleAddVendor = (payload: AddVendorSubmission) => {
    const vendorName = payload.vendorName.trim();

    if (!vendorName) {
      setStatusMessage("Vendor name is required for manual ingestion.");
      return;
    }

    const isDuplicate = vendors.some((vendor) => vendor.vendorName.toLowerCase() === vendorName.toLowerCase());
    if (isDuplicate) {
      setStatusMessage(`Vendor ${vendorName} already exists in the registry.`);
      return;
    }

    const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const normalizedVendorId = vendorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const vendorId = normalizedVendorId.length > 0 ? normalizedVendorId : `vendor-${Date.now()}`;
    const mappedEntity = mapIndustryToEntity(payload.industry);

    const parsedExpirationDate = payload.expirationDate.trim().length > 0
      ? new Date(`${payload.expirationDate}T00:00:00.000Z`)
      : null;
    const expirationDate = parsedExpirationDate && !Number.isNaN(parsedExpirationDate.getTime())
      ? parsedExpirationDate.toISOString()
      : ninetyDaysFromNow;

    setVendors((current) => [
      {
        vendorName,
        associatedEntity: mappedEntity,
        industry: payload.industry,
        vendorType: payload.vendorType,
        riskTier: payload.riskTier,
        securityRating: createSecurityRating(payload.riskTier),
        contractStatus: "MANUAL INGESTION",
        documentExpirationDate: expirationDate,
        lastRequestSent: null,
        currentCadence: "90",
        criticalSubProcessors: [{ name: "Pending Sub-Processor Mapping", status: "SECURE" }],
      },
      ...current,
    ]);

    appendAuditLog({
      action_type: "CONFIG_CHANGE",
      log_type: "GRC",
      metadata_tag: "VENDOR_GOVERNANCE",
      description: `User [Dereck] manually ingested Vendor [${vendorName}]`,
    });

    const hasClassifiedDocument = payload.fileName && payload.documentType !== "UNKNOWN";

    if (hasClassifiedDocument) {
      addVendorEvidenceEntry({
        fileName: payload.fileName || `${vendorId}-${payload.documentType}.pdf`,
        entity: mappedEntity,
        vendorId,
        documentType: payload.documentType,
        expirationDate: payload.expirationDate,
      });

      appendAuditLog({
        action_type: "CONFIG_CHANGE",
        log_type: "GRC",
        metadata_tag: "VENDOR_GOVERNANCE",
        description: `AI successfully classified and ingested ${payload.documentType} for ${vendorName}`,
      });
    }

    setStatusMessage(
      hasClassifiedDocument
        ? `Vendor ${vendorName} ingested with AI-classified ${payload.documentType} evidence.`
        : `Vendor ${vendorName} manually ingested and added to active registry.`,
    );
    setIsAddVendorModalOpen(false);
  };

  const handleEmailVendor = (vendorName: string, context: VendorEmailContext) => {
    if (notificationSentVendors[vendorName]) {
      setStatusMessage(`Notification already sent for ${vendorName}. Upload new evidence to clear the reminder flag.`);
      return;
    }

    const vendorEmail = toVendorEmail(vendorName);
    const internalStakeholderEmail = resolveInternalStakeholderEmail(context.associatedEntity);
    const cisoStakeholder = systemConfig.companyStakeholders.find(
      (stakeholder) => stakeholder.title.toLowerCase().includes("ciso"),
    );
    const cisoEmail = cisoStakeholder?.email.trim() || "ciso@ironframe.local";
    const template =
      systemConfig.vendorDocumentUpdateTemplate ||
      DEFAULT_VENDOR_EVIDENCE_REQUEST_TEMPLATE;
    const gapSummary = buildDocumentGapSummary({
      vendorType: context.vendorType,
      soc2Status: context.soc2Status,
      soc2ExpirationDate: context.soc2ExpirationDate,
      evidenceLockerDocs: context.evidenceLockerDocs,
    });

    const subject = `Evidence Request // ${vendorName}`;
    const body = [
      `Vendor Name: ${vendorName}`,
      "Request Type: Evidence Refresh",
      "Primary Document: SOC2",
      `Document Gaps: ${gapSummary}`,
      template,
    ].join("\n");

    const ccRecipients = Array.from(new Set([internalStakeholderEmail, cisoEmail].filter((email) => email.trim().length > 0)));
    const mailto = `mailto:${encodeURIComponent(vendorEmail)}?cc=${encodeURIComponent(ccRecipients.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");

    const mail = sendVendorDocumentUpdateRequest(vendorName, vendorEmail, template);
    setLastVendorMailId(mail.id);
    setNotificationSentVendors((current) => ({
      ...current,
      [vendorName]: true,
    }));

    appendAuditLog({
      action_type: "CONFIG_CHANGE",
      log_type: "GRC",
      metadata_tag: "VENDOR_GOVERNANCE",
      description: `Dereck contacted ${vendorName} for evidence request`,
    });

    setStatusMessage(
      `Vendor Evidence Request sent to ${vendorName} (${vendorEmail}) with CC (${ccRecipients.join(" | ")}) and Document Gaps: ${gapSummary}. Read receipt pixel: ${mail.trackingPixelUrl}`,
    );
  };

  const handleMonitoringApproval = (alert: MonitoringAlert) => {
    const vendor = vendorGraph.find((item) => item.vendorName === alert.vendorName);
    if (!vendor) {
      setMonitoringAlerts((current) => current.filter((item) => item.id !== alert.id));
      return;
    }

    const result = versionVendorEvidenceEntry({
      vendorId: vendor.vendorId,
      documentType: alert.documentType,
      incomingFileName: alert.suggestedFileName,
      entity: vendor.associatedEntity as "MEDSHIELD" | "VAULTBANK" | "GRIDCORE",
    });

    if (vendor.cascadedRiskTier === "CRITICAL" || vendor.cascadedRiskTier === "HIGH") {
      setWeeklySummary(incrementRemediatedHighRisk(1));
    }

    setMonitoringAlerts((current) => current.filter((item) => item.id !== alert.id));
    setStatusMessage(
      `Permission granted. ${alert.documentType} downloaded and versioned as ${
        "versionedFileName" in result ? result.versionedFileName : alert.suggestedFileName
      }`,
    );
  };

  const handleSimulateReceipt = () => {
    if (!lastVendorMailId) {
      return;
    }

    logReadReceipt(lastVendorMailId);
    setStatusMessage("Vendor read receipt updated to ACKNOWLEDGED.");
  };

  const handleSimulateThirtyDay = (vendorName: string) => {
    if (simulationRequests >= MAX_SIMULATION_REQUESTS) {
      setStatusMessage("Simulation request limit reached (5). Reset the page state to run additional tests.");
      return;
    }

    setSimulationRequests((current) => current + 1);
    const expirationDateValue = new Date();
    expirationDateValue.setUTCDate(expirationDateValue.getUTCDate() + 30);
    const expirationDate = expirationDateValue.toISOString();

    setVendors((current) => {
      const updated = current.map((vendor) =>
        vendor.vendorName === vendorName
          ? {
              ...vendor,
              documentExpirationDate: expirationDate,
            }
          : vendor,
      );

      const result = dispatchCadenceEscalations(updated, {
        cadenceAlerts: systemConfig.cadenceAlerts,
        companyStakeholders: systemConfig.companyStakeholders,
        vendorDocumentUpdateTemplate: systemConfig.vendorDocumentUpdateTemplate,
      });

      const thirtyDayEvents = result.dispatchedEvents.filter(
        (event) => event.vendorName === vendorName && event.milestone === "30",
      );

      if (thirtyDayEvents.length > 0) {
        const recipients = thirtyDayEvents.map((event) => event.recipientTitles[0]).join(" | ");
        setStatusMessage(`30-day escalation sent for ${vendorName}: ${recipients}.`);
      } else {
        setStatusMessage(`Simulation applied for ${vendorName}. No 30-day escalation was sent (check CISO/Legal stakeholder emails and toggle state).`);
      }

      return result.vendors;
    });
  };

  const handleVendorAction = (
    vendorName: string,
    associatedEntity: string,
    action: VendorActionItem,
    vendorType: VendorType,
    soc2Status: Soc2Status,
    soc2ExpirationDate: string,
    evidenceLockerDocs: string[],
  ) => {
    setOpenActionMenu(null);

    if (action === "Quick-Notify CISO (SOC2 Expired)") {
      if (notificationSentVendors[vendorName]) {
        setStatusMessage(`Notification already sent for ${vendorName}. Upload new evidence to clear the reminder flag.`);
        return;
      }

      const cisoStakeholder = systemConfig.companyStakeholders.find(
        (stakeholder) => stakeholder.title.toLowerCase().includes("ciso"),
      );
      const cisoEmail = cisoStakeholder?.email.trim() || "ciso@ironframe.local";

      const subject = `SOC2 Expiration Alert // ${vendorName}`;
      const body = [
        `Vendor Name: ${vendorName}`,
        "Document Type: SOC2",
        `SOC2 Status: ${soc2Status}`,
        `Expiration Date: ${soc2ExpirationDate}`,
      ].join("\n");

      const mailto = `mailto:${encodeURIComponent(cisoEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailto, "_blank");

      appendAuditLog({
        action_type: "CONFIG_CHANGE",
        log_type: "GRC",
        metadata_tag: "VENDOR_GOVERNANCE",
        description: `CISO notified of SOC2 expiration for ${vendorName}`,
      });

      setNotificationSentVendors((current) => ({
        ...current,
        [vendorName]: true,
      }));

      setStatusMessage(`Quick-notify draft opened for ${cisoEmail}.`);
      return;
    }

    if (action === "Email Vendor") {
      handleEmailVendor(vendorName, {
        associatedEntity,
        vendorType,
        vendorId: vendorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        soc2Status,
        soc2ExpirationDate,
        evidenceLockerDocs,
      });
      return;
    }

    if (action === "General RFI") {
      const vendorEmail = toVendorEmail(vendorName);
      const internalStakeholderEmail = resolveInternalStakeholderEmail(associatedEntity);
      setRfiTarget({
        vendorName,
        vendorEmail,
        internalStakeholderEmail,
      });
      return;
    }

    if (action === "Upload New Evidence") {
      setNotificationSentVendors((current) => {
        const next = { ...current };
        delete next[vendorName];
        return next;
      });

      setVendors((current) =>
        current.map((vendor) =>
          vendor.vendorName === vendorName
            ? {
                ...vendor,
                contractStatus: "EVIDENCE UPDATED",
                lastRequestSent: null,
              }
            : vendor,
        ),
      );
    }

    appendAuditLog({
      action_type: "CONFIG_CHANGE",
      log_type: "GRC",
      metadata_tag: "VENDOR_GOVERNANCE",
      description: `Vendor Action: ${action} executed for ${vendorName}.`,
    });

    setStatusMessage(`${action} action executed for ${vendorName}.`);
  };

  useEffect(() => {
    const downloadBlob = (content: string, fileName: string, mimeType: string) => {
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      window.URL.revokeObjectURL(url);
    };

    const exportFilteredVendorList = (format: "csv" | "json" | "both") => {
      const exportRows = vendorGraph.map((vendor) => ({
        vendorName: vendor.vendorName,
        associatedEntity: vendor.associatedEntity,
        riskTier: vendor.cascadedRiskTier,
        securityRating: vendor.securityRating,
        contractStatus: vendor.cascadedContractStatus,
        lastAuditDate: vendor.lastAuditDate,
        daysUntilExpiration: vendor.daysUntilExpiration,
        cadence: vendor.currentCadence,
        evidenceLocker: vendor.evidenceLockerDocs.join("|"),
      }));

      const exportDate = new Date().toISOString().slice(0, 10);

      if (format === "csv" || format === "both") {
        const csvHeader = "vendor_name,associated_entity,risk_tier,security_rating,contract_status,last_audit_date,days_until_expiration,cadence,evidence_locker";
        const csvRows = exportRows.map((row) =>
          [
            row.vendorName,
            row.associatedEntity,
            row.riskTier,
            row.securityRating,
            row.contractStatus,
            row.lastAuditDate,
            String(row.daysUntilExpiration),
            row.cadence,
            row.evidenceLocker,
          ]
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(","),
        );
        downloadBlob([csvHeader, ...csvRows].join("\n"), `vendor-intelligence-${exportDate}.csv`, "text/csv;charset=utf-8;");
      }

      if (format === "json" || format === "both") {
        downloadBlob(JSON.stringify(exportRows, null, 2), `vendor-intelligence-${exportDate}.json`, "application/json;charset=utf-8;");
      }

      setStatusMessage(`Exported ${exportRows.length} filtered vendors (${format.toUpperCase()}).`);
    };

    const handleVendorDownload = (event: Event) => {
      const customEvent = event as CustomEvent<{ format?: "csv" | "json" | "both" }>;
      const requestedFormat = customEvent.detail?.format ?? "both";
      exportFilteredVendorList(requestedFormat);
    };

    window.addEventListener("vendors:download", handleVendorDownload as EventListener);
    return () => window.removeEventListener("vendors:download", handleVendorDownload as EventListener);
  }, [vendorGraph]);

  return (
    <div className="min-h-full bg-slate-950 p-6">
      <NotificationHub
        alerts={monitoringAlerts}
        resolveRiskTier={resolveAlertRiskTier}
        onApprove={handleMonitoringApproval}
        onReject={(alertId) => setMonitoringAlerts((current) => current.filter((alert) => alert.id !== alertId))}
        onArchiveLowPriority={handleArchiveLowPriorityAlerts}
      />

      <section className="rounded border border-slate-800 bg-slate-900/40 p-4">
        <h1 className="mb-4 text-[11px] font-bold uppercase tracking-wide text-white">SUPPLY CHAIN // GLOBAL VENDOR INTELLIGENCE</h1>

        <div className="mb-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddVendorModalOpen(true)}
              className={`relative z-[90] inline-flex h-8 items-center gap-1 rounded border border-slate-800 bg-slate-950 px-3 text-[10px] font-bold uppercase tracking-wide text-slate-300 whitespace-nowrap hover:border-blue-500 ${
                isAddVendorPulseActive ? "animate-pulse" : ""
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              ADD VENDOR
            </button>

            <div className="relative w-[260px] shrink-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search vendor, entity, or contract status"
                className="bg-slate-950 border border-slate-800 rounded px-4 py-2 text-[11px] text-white w-full pl-9 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setRiskFilter("ALL")}
              className={`h-8 rounded border px-3 text-[10px] font-bold uppercase leading-none tracking-wide whitespace-nowrap ${
                riskFilter === "ALL"
                  ? "border-blue-500/70 bg-blue-500/15 text-blue-200"
                  : "border-slate-800 bg-slate-950 text-slate-400"
              }`}
            >
              All Risk
            </button>
            <button
              type="button"
              onClick={() => setRiskFilter("HIGH")}
              className={`h-8 rounded border px-3 text-[10px] font-bold uppercase leading-none tracking-wide whitespace-nowrap ${
                riskFilter === "HIGH"
                  ? "border-red-500/70 bg-red-500/15 text-red-200"
                  : "border-slate-800 bg-slate-950 text-slate-400"
              }`}
            >
              High
            </button>
            <button
              type="button"
              onClick={() => setRiskFilter("MED")}
              className={`h-8 rounded border px-3 text-[10px] font-bold uppercase leading-none tracking-wide whitespace-nowrap ${
                riskFilter === "MED"
                  ? "border-amber-500/70 bg-amber-500/15 text-amber-200"
                  : "border-slate-800 bg-slate-950 text-slate-400"
              }`}
            >
              Med
            </button>
            <button
              type="button"
              onClick={() => setRiskFilter("LOW")}
              className={`h-8 rounded border px-3 text-[10px] font-bold uppercase leading-none tracking-wide whitespace-nowrap ${
                riskFilter === "LOW"
                  ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-200"
                  : "border-slate-800 bg-slate-950 text-slate-400"
              }`}
            >
              Low
            </button>
            <Link
              href="/reports/audit-trail?scope=vendor-changes"
              className="inline-flex h-8 items-center rounded border border-slate-800 bg-slate-950 px-3 text-[10px] font-bold uppercase leading-none tracking-wide text-slate-300 whitespace-nowrap hover:border-blue-500"
            >
              Activity Log
            </Link>

            <select
              value={industry}
              onChange={(event) => setIndustry(event.target.value as "ALL" | Industry)}
              className="h-8 w-[150px] shrink-0 truncate overflow-hidden text-ellipsis whitespace-nowrap rounded border border-slate-800 bg-slate-950 px-3 pr-7 text-[10px] text-white focus:border-blue-500 focus:outline-none"
              title="Industry filter"
            >
              <option value="ALL">Industry: All</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Finance">Finance</option>
              <option value="Energy">Energy</option>
            </select>

            <select
              value={complianceFilter}
              onChange={(event) => setComplianceFilter(event.target.value as ComplianceFilter)}
              className="h-8 w-[180px] shrink-0 truncate overflow-hidden text-ellipsis whitespace-nowrap rounded border border-slate-800 bg-slate-950 px-3 pr-7 text-[10px] text-white focus:border-blue-500 focus:outline-none"
              title="Compliance calendar filter"
            >
              <option value="ALL">Compliance Calendar: All</option>
              <option value="EXPIRING_30">Expiring &lt; 30 Days</option>
              <option value="AUDIT_DUE">Audit Due</option>
              <option value="RECENTLY_ADDED">Recently Added</option>
            </select>

            <button
              type="button"
              onClick={() => {
                if (typeof window === "undefined") {
                  return;
                }

                window.dispatchEvent(new CustomEvent("vendors:download", { detail: { format: "both" } }));
              }}
              className="h-8 rounded border border-slate-800 bg-slate-950 px-3 text-[10px] font-bold uppercase leading-none tracking-wide text-slate-300 whitespace-nowrap hover:border-blue-500"
            >
              Download
            </button>
            <button
              type="button"
              onClick={() => setView("MAP")}
              className={`h-8 rounded border px-3 text-[10px] font-bold uppercase leading-none tracking-wide whitespace-nowrap ${
                view === "MAP"
                  ? "border-blue-500/70 bg-blue-500/15 text-blue-200"
                  : "border-slate-800 bg-slate-950 text-slate-400"
              }`}
            >
              Map View
            </button>
            <button
              type="button"
              onClick={() => setView("TABLE")}
              className={`h-8 rounded border px-3 text-[10px] font-bold uppercase leading-none tracking-wide whitespace-nowrap ${
                view === "TABLE"
                  ? "border-blue-500/70 bg-blue-500/15 text-blue-200"
                  : "border-slate-800 bg-slate-950 text-slate-400"
              }`}
            >
              Table View
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window === "undefined") {
                  return;
                }

                window.dispatchEvent(new CustomEvent("vendors:open-summary"));
              }}
              className="h-8 rounded border border-slate-800 bg-slate-950 px-3 text-[10px] font-bold uppercase leading-none tracking-wide text-slate-300 whitespace-nowrap hover:border-blue-500"
            >
              Summary
            </button>
            <Link
              href="/"
              className="inline-flex h-8 items-center rounded border border-slate-800 bg-slate-950 px-3 text-[10px] font-bold uppercase leading-none tracking-wide text-slate-300 whitespace-nowrap hover:border-blue-500"
            >
              Back
            </Link>
          </div>
        </div>

        {complianceFilter !== "ALL" && (
          <div className="mb-3 rounded border border-blue-500/50 bg-blue-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-blue-200">
            30/60/90 Escalation Engine linked to Compliance Calendar filter: {complianceFilter.replaceAll("_", " ")}
          </div>
        )}

        {view === "TABLE" ? (
        <div className="rounded border border-slate-800">
          <div className="grid grid-cols-9 border-b border-slate-800 bg-slate-950 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-300">
            <p>Scorecard</p>
            <p>VENDOR NAME</p>
            <p>ASSOCIATED ENTITY</p>
            <p>RISK TIER</p>
            <p data-testid="security-rating-header">SECURITY RATING</p>
            <p>CONTRACT STATUS</p>
            <p>COMPLIANCE COUNTDOWN</p>
            <p>EVIDENCE LOCKER</p>
            <p data-print-hide="true" className="text-right" style={{ textAlign: "right" }}>ACTIONS</p>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2 space-y-2">
            {vendorGraph.map((vendor) => (
              <div
                key={`${vendor.vendorName}-${vendor.associatedEntity}`}
                data-testid="vendor-row"
                data-risk-tier={vendor.cascadedRiskTier}
                className={`grid grid-cols-9 items-center gap-3 bg-slate-900/40 border px-4 py-3 text-[11px] text-slate-200 transition-colors hover:border-blue-500/50 hover:bg-slate-900/70 ${
                  vendor.cascadedRiskTier === "CRITICAL" && vendor.daysUntilExpiration < 30
                    ? "border-red-500/70 bg-red-500/10"
                    : "border-slate-800"
                }`}
              >
                <div className="group relative flex items-center justify-center gap-2">
                  <ScorecardIcon
                    grade={vendor.healthScore.grade}
                    className={GRADE_BADGE_STYLE[vendor.healthScore.grade]}
                    onClick={scrollToSecurityRatingColumn}
                  />
                  <RiskSparkbar
                    trendPoints={getRiskTrendPoints(vendor)}
                    statusLabel={getRecentStatusChangeLabel(vendor)}
                    data-testid="risk-sparkbar"
                  />
                  <div className="pointer-events-none absolute left-14 top-1/2 z-20 hidden w-64 -translate-y-1/2 rounded border border-slate-700 bg-slate-950/95 px-2 py-2 text-[9px] text-slate-200 group-hover:block">
                    <p className="mb-1 font-bold uppercase tracking-wide text-slate-300">Score Breakdown</p>
                    <div className="space-y-0.5">
                      {vendor.healthScore.breakdown.map((line) => (
                        <p key={`${vendor.vendorId}-${line}`}>{line}</p>
                      ))}
                    </div>
                    <p className="mt-1 font-bold text-slate-300">Score: {vendor.healthScore.score}</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-white">{vendor.vendorName}</p>
                    {vendor.notificationSent ? (
                      <span
                        title="Outreach sent"
                        aria-label="Outreach sent"
                        className="inline-flex items-center text-slate-400"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                  </div>
                  {vendor.notificationSent ? (
                    <span className="sr-only">Notification Sent</span>
                  ) : null}
                </div>
                <p>{vendor.associatedEntity}</p>
                <p className={`font-bold ${RISK_TIER_STYLE[vendor.cascadedRiskTier]}`}>{vendor.cascadedRiskTier}</p>
                <p>{vendor.securityRating}</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-slate-300">{vendor.cascadedContractStatus}</p>
                </div>
                <div>
                  <p className={`font-bold uppercase ${getCountdownClassName(vendor.daysUntilExpiration)}`}>
                    {getCountdownLabel(vendor.daysUntilExpiration)}
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-wide text-blue-200">{getCadenceLabel(vendor.currentCadence)}</p>
                  {vendor.createdDaysAgo <= RECENTLY_ADDED_WINDOW_DAYS && (
                    <p className="mt-1 text-[9px] uppercase tracking-wide text-emerald-300">Recently Added</p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSimulateThirtyDay(vendor.vendorName)}
                    className="mt-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-300"
                  >
                    Simulate 30-Day
                  </button>
                </div>
                <div>
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Evidence Locker</p>
                  <div className="flex flex-wrap gap-1">
                    {vendor.evidenceLockerDocs.map((documentName) => (
                      <button
                        key={`${vendor.vendorName}-${documentName}`}
                        type="button"
                        onClick={() => setStatusMessage(`${vendor.vendorName}: opened ${documentName} evidence artifact.`)}
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-200 hover:border-blue-500"
                      >
                        {documentName}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative flex justify-end" data-print-hide="true">
                  <button
                    type="button"
                    aria-label={`Vendor actions for ${vendor.vendorName}`}
                    onClick={() =>
                      setOpenActionMenu((current) =>
                        current === `${vendor.vendorName}-${vendor.associatedEntity}`
                          ? null
                          : `${vendor.vendorName}-${vendor.associatedEntity}`,
                      )
                    }
                    className="rounded border border-slate-700 bg-slate-950 p-1 text-slate-300 hover:border-blue-500 hover:text-white"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {openActionMenu === `${vendor.vendorName}-${vendor.associatedEntity}` ? (
                    <div className="absolute right-0 top-8 z-20 w-48 rounded border border-slate-700 bg-slate-950 p-1 shadow-lg">
                      {VENDOR_ACTION_ITEMS.map((action) => (
                        <button
                          key={`${vendor.vendorName}-${action}`}
                          type="button"
                          onClick={() =>
                            handleVendorAction(
                              vendor.vendorName,
                              vendor.associatedEntity,
                              action,
                              vendor.vendorType,
                              vendor.soc2Status,
                              vendor.soc2ExpirationDate,
                              vendor.evidenceLockerDocs,
                            )
                          }
                          className={`w-full rounded px-2 py-1 text-left text-[10px] font-bold uppercase tracking-wide hover:bg-slate-800 ${
                            action === "Quick-Notify CISO (SOC2 Expired)" && vendor.soc2Status === "Expired"
                              ? "border border-red-500/70 bg-red-500/15 text-red-200"
                              : "text-slate-200"
                          }`}
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {vendorGraph.length === 0 && (
              <div className="bg-slate-900/40 border border-slate-800 px-4 py-6 text-center text-[11px] text-slate-400">
                No vendors match the current search/filter criteria.
              </div>
            )}
          </div>
        </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[2fr_1fr]">
            <Visualizer
              vendors={vendorGraph}
              selectedVendorId={selectedVendorId}
              activeVendorIds={activeNotificationVendorIds}
              onSelectVendor={(vendorId) => {
                setSelectedVendorId(vendorId);
                const selected = vendorGraph.find((vendor) => vendor.vendorId === vendorId);
                if (selected) {
                  setOpenActionMenu(`${selected.vendorName}-${selected.associatedEntity}`);
                }
              }}
            />

            <div className="rounded border border-slate-800 bg-slate-950/50 p-3 pt-10">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-300">Selected Vendor // History + Actions</p>
              {!selectedVendor ? (
                <p className="text-[10px] text-slate-400">Click a vendor node to open document version history and action menu.</p>
              ) : (
                <>
                  <div className="mb-3 rounded border border-slate-800 bg-slate-900/40 p-2">
                    <p className="text-[11px] font-bold text-white">{selectedVendor.vendorName}</p>
                    <p className="text-[9px] uppercase tracking-wide text-slate-400">{selectedVendor.associatedEntity} • {selectedVendor.cascadedRiskTier}</p>
                  </div>

                  <div className="mb-3 rounded border border-slate-800 bg-slate-900/40 p-2">
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">Document Versioning History</p>
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      {selectedVendorHistory.length === 0 ? (
                        <p className="text-[9px] text-slate-500">No versioned evidence entries found for this vendor.</p>
                      ) : (
                        selectedVendorHistory.map((entry) => (
                          <div key={entry.id} className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1 text-[9px] text-slate-300">
                            <p className="font-bold text-slate-200">{entry.name}</p>
                            <p>{entry.documentType || "Document"} • {entry.status} • {entry.timestamp}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded border border-slate-800 bg-slate-900/40 p-2">
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">Actions Menu</p>
                    <div className="space-y-1">
                      {VENDOR_ACTION_ITEMS.map((action) => (
                        <button
                          key={`map-action-${selectedVendor.vendorName}-${action}`}
                          type="button"
                          onClick={() =>
                            handleVendorAction(
                              selectedVendor.vendorName,
                              selectedVendor.associatedEntity,
                              action,
                              selectedVendor.vendorType,
                              selectedVendor.soc2Status,
                              selectedVendor.soc2ExpirationDate,
                              selectedVendor.evidenceLockerDocs,
                            )
                          }
                          className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-left text-[9px] font-bold uppercase tracking-wide text-slate-200 hover:border-blue-500"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-3">
          {statusMessage && <p className="text-[10px] text-slate-300">{statusMessage}</p>}
          {lastVendorMailId && (
            <button
              type="button"
              onClick={handleSimulateReceipt}
              className="rounded border border-emerald-500/70 bg-emerald-500/15 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-300"
            >
              Simulate Vendor Open
            </button>
          )}
        </div>

        <style jsx global>{`
          @media print {
            header {
              display: none !important;
            }

            .vendor-header-left-empty {
              display: none !important;
            }

            [data-print-hide='true'] {
              display: none !important;
            }
          }
        `}</style>
      </section>

      {isAddVendorModalOpen ? (
        <AddVendorModal
          isOpen={isAddVendorModalOpen}
          onClose={() => setIsAddVendorModalOpen(false)}
          onSubmit={handleAddVendor}
          vendorTypeRequirements={systemConfig.vendorTypeRequirements}
        />
      ) : null}

      {rfiTarget ? (
        <RFITemplate
          isOpen
          vendorName={rfiTarget.vendorName}
          vendorEmail={rfiTarget.vendorEmail}
          internalStakeholderEmail={rfiTarget.internalStakeholderEmail}
          checklistItems={systemConfig.generalRfiChecklist}
          onClose={() => setRfiTarget(null)}
          onGenerate={(payload) => {
            setStatusMessage(`General RFI draft created for ${rfiTarget.vendorName}: ${payload.selectedItems.join(", ") || "No items selected"}.`);
            appendAuditLog({
              action_type: "CONFIG_CHANGE",
              log_type: "GRC",
              metadata_tag: "VENDOR_GOVERNANCE",
              description: `General RFI prepared for ${rfiTarget.vendorName}`,
            });
            setRfiTarget(null);
          }}
        />
      ) : null}

      {isSummaryOpen ? (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/70">
          <div className="w-full max-w-md rounded border border-slate-800 bg-slate-900 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-white">Weekly GRC Summary</h3>
              <button
                type="button"
                onClick={() => setIsSummaryOpen(false)}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-bold uppercase text-slate-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-[10px] text-slate-200">
              <div className="rounded border border-slate-800 bg-slate-950/60 px-3 py-2">
                <p className="font-bold uppercase tracking-wide text-slate-300">Archived Low-Priority</p>
                <p className="mt-1 text-[12px] font-bold text-emerald-300">{weeklySummary.archivedLowPriority}</p>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/60 px-3 py-2">
                <p className="font-bold uppercase tracking-wide text-slate-300">Remediated High-Risk</p>
                <p className="mt-1 text-[12px] font-bold text-red-300">{weeklySummary.remediatedHighRisk}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
