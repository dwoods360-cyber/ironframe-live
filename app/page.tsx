"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ActiveRisks from "./components/ActiveRisks";
import AgentStream from "./components/AgentStream";
import AuditIntelligence from "./components/AuditIntelligence";
import StrategicIntel from "./components/StrategicIntel";
import ThreatPipeline from "./components/ThreatPipeline";
import DashboardAlertBanners from "./components/DashboardAlertBanners";
import GlobalHealthSummaryCard from "./components/GlobalHealthSummaryCard";
import RecentSubmissionsTable from "./components/RecentSubmissionsTable";
import { useVendorAssessmentStore } from "./store/vendorQuestionnaireStore";
import { useRemediationStore } from "./store/remediationStore";
import { syncRegulatoryFeed, useRegulatoryStore, VendorRegulatoryFeedItem } from "./store/regulatoryStore";
import { hydrateSystemConfig, useSystemConfigStore } from "./store/systemConfigStore";
import { fetchIndustryIntelligence } from "./utils/coreintel";
import { parseSocEmailToAlert, simulateSocEmail } from "./utils/socIntake";
import { maskSensitiveData } from "./utils/retentionPolicy";
import { StreamAlert } from "./hooks/useAlerts";
import { getUnresponsiveVendorRequests } from "./utils/mailHub";
import { useMailHubStore } from "./utils/mailHubStore";
import {
  buildAggregateEntityData,
  calculateEntityScore,
  calculateFinancialExposure,
  ENTITY_FINANCIAL_FACTORS,
  ENTITY_SCORING_DATA,
} from "./utils/scoring";

type AgentHealth = "HEALTHY" | "DEGRADED" | "CRITICAL";

type SupplyChainThreat = {
  vendorName: string;
  impact: string;
  severity: "CRITICAL";
  source: "Nth-Party Map";
  liabilityUsd: number;
};

const BASELINE_VENDOR_REGULATORY_STATUS = new Map<string, VendorRegulatoryFeedItem["regulatoryStatus"]>([
  ["Azure Health", "COMPLIANT"],
  ["KubeOps EU-West", "UNDER REVIEW"],
  ["SWIFT", "COMPLIANT"],
]);

export default function Page() {
  const vendorAssessments = useVendorAssessmentStore();
  const remediationState = useRemediationStore();
  const regulatoryState = useRegulatoryStore();
  const systemConfig = useSystemConfigStore();
  const mailHubState = useMailHubStore();
  const recentSubmissions = vendorAssessments.slice(0, 6);
  const [supplyChainViolation, setSupplyChainViolation] = useState<string | null>(null);
  const [phoneHomeAlert, setPhoneHomeAlert] = useState<string | null>(null);
  const [medshieldTrendMultiplier, setMedshieldTrendMultiplier] = useState(1);
  const [coreintelTrendActive, setCoreintelTrendActive] = useState(false);
  const [coreintelLiveFeed, setCoreintelLiveFeed] = useState<string[]>([
    "Analyzing NIST 800-53 Rev 5 updates...",
    "Ingesting CISA Zero-Day feed...",
    "Cross-mapping vendor controls against HIPAA safeguards...",
  ]);
  const [heartbeatFailure, setHeartbeatFailure] = useState(false);
  const [agentStreamAlerts, setAgentStreamAlerts] = useState<StreamAlert[]>([]);
  const [pipelineSupplyChainThreat, setPipelineSupplyChainThreat] = useState<SupplyChainThreat | null>(null);
  const [heuristicAnomalyDetectionEnabled] = useState(false);
  const previousVendorStatusRef = useRef(new Map(BASELINE_VENDOR_REGULATORY_STATUS));
  const simulatedSocEmailProcessedRef = useRef(false);
  const anomalyCooldownRef = useRef(new Map<string, number>());
  const processedCadenceDispatchIdsRef = useRef(new Set<string>());

  const calculateCoreintelSeverity = (liabilityUsd: number) => {
    return Math.min(100, Math.round((liabilityUsd / 12_000_000) * 100));
  };

  const appendOrchestrationLog = (message: string) => {
    void message;
  };

  const appendCoreintelFeed = (message: string) => {
    setCoreintelLiveFeed((current) => [message, ...current].slice(0, 20));
  };

  const setSupplyChainThreat = (vendorName: string, liabilityUsd: number) => {
    setPipelineSupplyChainThreat({
      vendorName,
      impact: "Azure Health (Tier 1 Vendor) is now COMPROMISED.",
      severity: "CRITICAL",
      source: "Nth-Party Map",
      liabilityUsd,
    });
  };

  const upsertAgentAlert = (nextAlert: StreamAlert) => {
    setAgentStreamAlerts((current) => {
      if (current.some((entry) => entry.id === nextAlert.id)) {
        return current;
      }

      return [nextAlert, ...current].slice(0, 20);
    });
  };

  useEffect(() => {
    hydrateSystemConfig();
  }, []);

  useEffect(() => {
    if (regulatoryState.feed.length === 0 && !regulatoryState.isSyncing) {
      void syncRegulatoryFeed();
    }
  }, [regulatoryState.feed.length, regulatoryState.isSyncing]);

  useEffect(() => {
    if (!systemConfig.socDepartmentEmail.trim()) {
      simulatedSocEmailProcessedRef.current = false;
      return;
    }

    if (!systemConfig.socEmailIntakeEnabled) {
      simulatedSocEmailProcessedRef.current = false;
      return;
    }

    if (simulatedSocEmailProcessedRef.current) {
      return;
    }

    const email = simulateSocEmail();
    const parsedResult = parseSocEmailToAlert(email, {
      enabled: systemConfig.socEmailIntakeEnabled,
      authorizedDomains: systemConfig.authorizedSocDomains,
    });

    if (!parsedResult.alert) {
      if (parsedResult.rejectionReason === "UNAUTHORIZED_SENDER") {
        const blockedLog = maskSensitiveData(
          `${new Date().toISOString()} Unauthorized Sender // sender_domain=${parsedResult.senderDomain} sender_email=${email.sender}`,
        );

        queueMicrotask(() => {
          appendOrchestrationLog(blockedLog);
          appendCoreintelFeed(`[EXTERNAL SOC] Unauthorized sender blocked: ${parsedResult.senderDomain}.`);
        });
      }

      simulatedSocEmailProcessedRef.current = true;
      return;
    }

    const socAlert = parsedResult.alert;

    queueMicrotask(() => {
      upsertAgentAlert({
        ...socAlert,
        type: "SOC_EMAIL" as const,
        origin: "SOC_INTAKE" as const,
        isExternalSOC: parsedResult.isVerifiedSender,
        sourceAgent: "EXTERNAL SOC" as const,
        title: socAlert.title === "Firewall Breach" ? "CRITICAL: Firewall Breach" : socAlert.title,
        status: "OPEN" as const,
      });
    });

    queueMicrotask(() => {
      appendCoreintelFeed(`[EXTERNAL SOC] Authorized alert ingested from ${email.sender}.`);
    });
    simulatedSocEmailProcessedRef.current = true;
  }, [systemConfig.authorizedSocDomains, systemConfig.socDepartmentEmail, systemConfig.socEmailIntakeEnabled]);

  useEffect(() => {
    let active = true;

    void fetchIndustryIntelligence().then((trends) => {
      if (!active) {
        return;
      }

      const hasHealthcareRansomwareTrend = trends.some(
        (trend) => trend.summary === "New Ransomware Variant detected in Healthcare",
      );

      setCoreintelLiveFeed((current) => {
        const trendLines = trends.map((trend) => `Knowledge Ingestion // ${trend.summary}`);
        return [...trendLines, ...current].slice(0, 12);
      });

      setCoreintelTrendActive(hasHealthcareRansomwareTrend);
      setMedshieldTrendMultiplier(hasHealthcareRansomwareTrend ? 1.15 : 1);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (regulatoryState.vendorRegulatoryFeed.length === 0) {
      return;
    }

    const previous = previousVendorStatusRef.current;
    const changedVendors: string[] = [];

    for (const item of regulatoryState.vendorRegulatoryFeed) {
      const previousStatus = previous.get(item.vendorName);
      if (previousStatus && previousStatus !== item.regulatoryStatus) {
        changedVendors.push(`${item.vendorName} (${item.source}: ${previousStatus} → ${item.regulatoryStatus})`);

        if (item.source === "Nth-Party Map" && item.regulatoryStatus === "VIOLATION DETECTED") {
          const liabilityUsd = 11_100_000;
          const severityScore = calculateCoreintelSeverity(liabilityUsd);
          const alertId = `stream-${item.vendorName}-${item.regulatoryStatus}-${regulatoryState.syncedAt ?? Date.now()}`;

          queueMicrotask(() => {
            setSupplyChainThreat(item.vendorName, liabilityUsd);

            appendOrchestrationLog(
              `${new Date().toISOString()} Telemetry // SUPPLY CHAIN VIOLATION routed to Medshield Threat Pipeline for ${item.vendorName}.`,
            );

            upsertAgentAlert({
              id: alertId,
              type: "AGENT_ALERT" as const,
              origin: "IRONSIGHT" as const,
              isExternalSOC: false,
              sourceAgent: "IRONSIGHT" as const,
              title: `SUPPLY CHAIN VIOLATION // Azure Health`,
              impact: "Nth-Party Breach Detected: KubeOps EU-West. Azure Health (Tier 1 Vendor) is now COMPROMISED.",
              severityScore,
              liabilityUsd,
              status: "OPEN" as const,
              createdAt: new Date().toISOString(),
            });
          });
        }
      }

      previous.set(item.vendorName, item.regulatoryStatus);
    }

    const nextSupplyChainViolation =
      changedVendors.length > 0 ? `SUPPLY CHAIN VIOLATION // ${changedVendors.join(" // ")}` : null;

    queueMicrotask(() => {
      setSupplyChainViolation(nextSupplyChainViolation);
    });
  }, [regulatoryState.syncedAt, regulatoryState.vendorRegulatoryFeed]);

  useEffect(() => {
    if (!heuristicAnomalyDetectionEnabled) {
      return;
    }

    const recentAlerts = agentStreamAlerts
      .filter((alert) => alert.type !== "ANOMALY")
      .map((alert) => ({ ...alert, timeMs: new Date(alert.createdAt).getTime() }))
      .filter((alert) => !Number.isNaN(alert.timeMs));

    const bySource = new Map<string, typeof recentAlerts>();
    for (const alert of recentAlerts) {
      const key = alert.sourceAgent;
      const bucket = bySource.get(key) ?? [];
      bucket.push(alert);
      bySource.set(key, bucket);
    }

    const now = Date.now();

    for (const [source, bucket] of bySource.entries()) {
      const inWindow = bucket
        .sort((a, b) => b.timeMs - a.timeMs)
        .filter((alert) => now - alert.timeMs <= 5000);

      if (inWindow.length < 3) {
        continue;
      }

      const cooldownUntil = anomalyCooldownRef.current.get(source) ?? 0;
      if (cooldownUntil > now) {
        continue;
      }

      const anomalyId = `anomaly-${source.toLowerCase().replace(/\s+/g, "-")}-${now}`;
      const title = "SYSTEM NOISE ANOMALY";
      const impact =
        source === "COREINTEL"
          ? "Coreintel: Risk Score Deviation Detected - $2.1M Variance"
          : `${source}: Rapid Alert Burst Detected - ${inWindow.length} alerts in < 5 seconds.`;

      queueMicrotask(() => {
        upsertAgentAlert({
          id: anomalyId,
          type: "ANOMALY" as const,
          origin: "SYSTEM" as const,
          isExternalSOC: false,
          sourceAgent: "IRONSIGHT" as const,
          title,
          impact,
          severityScore: 82,
          liabilityUsd: 2_100_000,
          status: "OPEN" as const,
          createdAt: new Date(now).toISOString(),
        });

        appendOrchestrationLog(
          `${new Date(now).toISOString()} SYSTEM NOISE ANOMALY // source=${source} count=${inWindow.length} window=<5s`,
        );
      });

      anomalyCooldownRef.current.set(source, now + 5000);
      break;
    }
  }, [agentStreamAlerts, heuristicAnomalyDetectionEnabled]);

  useEffect(() => {
    const unresponsiveRequests = getUnresponsiveVendorRequests();

    for (const request of unresponsiveRequests) {
      const vendorName = request.vendorName ?? "UNKNOWN VENDOR";
      const alertId = `unresponsive-${request.id}`;

      queueMicrotask(() => {
        upsertAgentAlert({
          id: alertId,
          type: "AGENT_ALERT" as const,
          origin: "IRONSIGHT" as const,
          isExternalSOC: false,
          sourceAgent: "IRONSIGHT" as const,
          title: `UNRESPONSIVE VENDOR // ${vendorName}`,
          impact: `No read receipt detected within 48 hours for document update request (${request.recipientEmail}).`,
          severityScore: 88,
          liabilityUsd: 1_250_000,
          status: "OPEN" as const,
          createdAt: new Date().toISOString(),
        });
      });
    }
  }, [mailHubState.outbound]);

  useEffect(() => {
    for (const mail of mailHubState.outbound) {
      if (mail.channel !== "CADENCE_30_STAKEHOLDER") {
        continue;
      }

      if (processedCadenceDispatchIdsRef.current.has(mail.id)) {
        continue;
      }

      processedCadenceDispatchIdsRef.current.add(mail.id);

      queueMicrotask(() => {
        upsertAgentAlert({
          id: `cadence-dispatch-${mail.id}`,
          type: "AGENT_ALERT" as const,
          origin: "IRONSIGHT" as const,
          isExternalSOC: false,
          sourceAgent: "IRONSIGHT" as const,
          title: "CISO/LEGAL ESCALATION DISPATCH CONFIRMED",
          impact: `30-day escalation sent for ${mail.vendorName ?? "vendor"} to ${mail.recipientTitle} (${mail.recipientEmail}).`,
          severityScore: 74,
          liabilityUsd: 350000,
          status: "OPEN" as const,
          createdAt: mail.sentAt,
        });
      });
    }
  }, [mailHubState.outbound]);

  const remediateSupplyChainThreat = (vendorName: string) => {
    const alertId = `pipeline-remediate-${vendorName.toLowerCase().replace(/\s+/g, "-")}`;

    setCoreintelLiveFeed((current) => [`[COREGUARD] Vendor Breach Response playbook launched for ${vendorName}.`, ...current].slice(0, 20));

    setAgentStreamAlerts((current) => {
      if (current.some((alert) => alert.id === alertId)) {
        return current;
      }

      return [
        {
          id: alertId,
          type: "AGENT_ALERT" as const,
          origin: "SYSTEM" as const,
          isExternalSOC: false,
          sourceAgent: "IRONSIGHT" as const,
          title: "Vendor Breach Response Playbook Initiated",
          impact: `Coreguard opened Vendor Breach Response playbook for ${vendorName}.`,
          severityScore: 93,
          liabilityUsd: 11_100_000,
          status: "APPROVED" as const,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 20);
    });
  };

  const approveRemediation = (alertId: string) => {
    setAgentStreamAlerts((current) =>
      current.map((alert) => (alert.id === alertId ? { ...alert, status: "APPROVED" } : alert)),
    );

    setAgentStreamAlerts((current) => {
      const source = current.find((alert) => alert.id === alertId);
      if (!source) {
        return current;
      }

      const playbookAlertId = `${alertId}-coreguard-playbook`;
      if (current.some((alert) => alert.id === playbookAlertId)) {
        return current;
      }

      return [
        {
          id: playbookAlertId,
          type: "AGENT_ALERT" as const,
          origin: "SYSTEM" as const,
          isExternalSOC: false,
          sourceAgent: "IRONSIGHT" as const,
          title: "Remediation Playbook Initiated",
          impact: `Coreguard launched containment and vendor isolation playbook for ${source.title.replace("Nth-Party Breach Detected: ", "")}.`,
          severityScore: source.severityScore,
          liabilityUsd: source.liabilityUsd,
          status: "APPROVED" as const,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 20);
    });

    setCoreintelLiveFeed((current) => [`[COREGUARD] Playbook execution started for ${alertId}.`, ...current].slice(0, 20));
  };

  const dismissAlert = async (alertId: string) => {
    setAgentStreamAlerts((current) =>
      current.map((alert) => (alert.id === alertId ? { ...alert, status: "DISMISSED" } : alert)),
    );

    setCoreintelLiveFeed((current) => [`[COREINTEL] Risk acceptance recorded for ${alertId}.`, ...current].slice(0, 20));

    await fetch("/api/audit/risk-acceptance", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        alertId,
        actor: "SECURITY_ANALYST",
        reason: "Operator dismissed remediation recommendation and accepted risk exposure.",
      }),
    }).catch(() => null);
  };

  useEffect(() => {
    let active = true;

    const runHeartbeat = async () => {
      try {
        const [healthResponse, assetsResponse] = await Promise.all([
          fetch("/api/health", { cache: "no-store" }),
          fetch("/api/medshield/assets", { cache: "no-store" }),
        ]);

        if (!active) {
          return;
        }

        const hasFailure = !healthResponse.ok || !assetsResponse.ok || Boolean(regulatoryState.error);
        setHeartbeatFailure(hasFailure);
        setPhoneHomeAlert(hasFailure ? "CRITICAL: AGENT MANAGER PHONING HOME" : null);
      } catch (_error) {
        if (!active) {
          return;
        }

        setHeartbeatFailure(true);
        setPhoneHomeAlert("CRITICAL: AGENT MANAGER PHONING HOME");
      }
    };

    void runHeartbeat();
    const interval = setInterval(() => {
      void runHeartbeat();
    }, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [regulatoryState.error]);

  const agentHealth = useMemo<{
    agentManager: AgentHealth;
    ironsight: AgentHealth;
    coreintel: AgentHealth;
  }>(() => {
    if (heartbeatFailure) {
      return {
        agentManager: "CRITICAL",
        ironsight: "DEGRADED",
        coreintel: "DEGRADED",
      };
    }

    return {
      agentManager: "HEALTHY",
      ironsight: supplyChainViolation ? "CRITICAL" : "HEALTHY",
      coreintel: coreintelTrendActive ? "HEALTHY" : "HEALTHY",
    };
  }, [coreintelTrendActive, heartbeatFailure, supplyChainViolation]);

  const applyRemediatedAssets = (entityKey: "medshield" | "vaultbank" | "gridcore") => {
    const source = ENTITY_SCORING_DATA[entityKey];

    return {
      ...source,
      assets: source.assets.map((asset) =>
        remediationState.remediatedAssetIds.includes(asset.id)
          ? {
              ...asset,
              status: "SECURE" as const,
            }
          : asset,
      ),
    };
  };

  const medshieldQuestionnaireThreats = vendorAssessments.filter(
    (entry) => entry.entityKey === "medshield" && !entry.mfaEnabled,
  ).length;
  const vaultbankQuestionnaireThreats = vendorAssessments.filter(
    (entry) => entry.entityKey === "vaultbank" && !entry.mfaEnabled,
  ).length;
  const gridcoreQuestionnaireThreats = vendorAssessments.filter(
    (entry) => entry.entityKey === "gridcore" && !entry.mfaEnabled,
  ).length;

  const adjustedEntities = [
    {
      ...applyRemediatedAssets("medshield"),
      activeThreats: ENTITY_SCORING_DATA.medshield.activeThreats + medshieldQuestionnaireThreats,
    },
    {
      ...applyRemediatedAssets("vaultbank"),
      activeThreats: ENTITY_SCORING_DATA.vaultbank.activeThreats + vaultbankQuestionnaireThreats,
    },
    {
      ...applyRemediatedAssets("gridcore"),
      activeThreats: ENTITY_SCORING_DATA.gridcore.activeThreats + gridcoreQuestionnaireThreats,
    },
  ];

  const aggregateEntityData = buildAggregateEntityData(adjustedEntities);
  const questionnaireImpact = vendorAssessments.reduce((sum, entry) => sum + entry.potentialFinancialImpact, 0);
  const medshieldExposure = calculateFinancialExposure(ENTITY_FINANCIAL_FACTORS.medshield) * medshieldTrendMultiplier;
  const potentialRevenueImpact =
    medshieldExposure +
    calculateFinancialExposure(ENTITY_FINANCIAL_FACTORS.vaultbank) +
    calculateFinancialExposure(ENTITY_FINANCIAL_FACTORS.gridcore) +
    questionnaireImpact -
    (remediationState.riskReductionByEntity.medshield +
      remediationState.riskReductionByEntity.vaultbank +
      remediationState.riskReductionByEntity.gridcore);
  const aggregateScore = calculateEntityScore(aggregateEntityData);
  const activeViolations =
    aggregateScore.criticalAssets + aggregateScore.vulnerableAssets + aggregateScore.activeThreats;

  return (
    <div className="flex h-full overflow-hidden bg-slate-950">
      <aside className="w-80 shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-950">
        <StrategicIntel
          agentHealth={agentHealth}
          phoneHomeAlert={phoneHomeAlert}
          coreintelLiveFeed={coreintelLiveFeed}
        />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto border-r border-slate-800 bg-slate-950 p-0">
        <DashboardAlertBanners phoneHomeAlert={phoneHomeAlert} regulatoryState={regulatoryState} />

        <GlobalHealthSummaryCard
          aggregateEntityData={aggregateEntityData}
          activeViolations={activeViolations}
          potentialRevenueImpact={potentialRevenueImpact}
          coreintelTrendActive={coreintelTrendActive}
        />

        <RecentSubmissionsTable recentSubmissions={recentSubmissions} />

        <ThreatPipeline
          supplyChainThreat={pipelineSupplyChainThreat}
          showSocStream={Boolean(systemConfig.socDepartmentEmail.trim())}
          onRemediateSupplyChainThreat={remediateSupplyChainThreat}
        />
        <ActiveRisks />
      </section>

      <aside className="w-80 shrink-0 overflow-y-auto bg-slate-950 p-3">
        <AgentStream
          alerts={agentStreamAlerts}
          socIntakeEnabled={systemConfig.socEmailIntakeEnabled}
          onApprove={approveRemediation}
          onDismiss={dismissAlert}
        />
        <AuditIntelligence />
      </aside>
    </div>
  );
}