"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ActiveRisks from "./components/ActiveRisks";
import AgentStream from "./components/AgentStream";
import AuditIntelligence from "./components/AuditIntelligence";
import HealthScoreBadge from "./components/HealthScoreBadge";
import StrategicIntel from "./components/StrategicIntel";
import ThreatPipeline from "./components/ThreatPipeline";
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
        {phoneHomeAlert && (
          <div className="border-b border-red-500/60 bg-red-500/15 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-red-300">
            {phoneHomeAlert}
            <a href="mailto:support@ironframe.local" className="ml-2 underline text-red-200">
              Contact Support
            </a>
          </div>
        )}

        <div className="border-b border-slate-800 bg-slate-900/50 px-4 py-2">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="rounded border border-red-500/70 bg-red-500/15 px-2 py-0.5 font-bold uppercase tracking-wide text-red-300">
              REGULATORY ALERT
            </span>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="whitespace-nowrap text-slate-200">
                {regulatoryState.ticker.length > 0
                  ? regulatoryState.ticker.join("  //  ")
                  : regulatoryState.isSyncing
                    ? "Syncing regulatory feed..."
                    : "No new regulatory alerts."}
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-800 bg-slate-950 p-4">
          <div className="group relative flex min-h-44 flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-6 transition-all hover:border-blue-500/60">
            <Link href="/vendors" aria-label="Open Global Vendor Intelligence" className="absolute inset-0 z-10" />
            <p className="text-[10px] font-bold uppercase tracking-wide text-white">SUPPLY CHAIN HEALTH</p>

            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">GLOBAL RATING</p>
              <HealthScoreBadge
                entityData={aggregateEntityData}
                scoreClassName="text-5xl [text-shadow:0_0_16px_rgba(16,185,129,0.35)]"
              />
            </div>

            <div className="flex justify-end">
              <div className="flex flex-col items-end gap-1.5">
                <span className="rounded border border-red-500 bg-red-500/20 px-2 py-1 text-[9px] font-bold uppercase text-red-500 animate-pulse">
                  {activeViolations} ACTIVE VIOLATION{activeViolations === 1 ? "" : "S"}
                </span>
                <Link
                  href="/vendors/portal"
                  className="relative z-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-bold uppercase text-slate-200 hover:border-blue-500 hover:text-blue-300"
                >
                  Open Vendor Portal
                </Link>
                <span className="rounded border border-blue-500/60 bg-blue-500/15 px-2 py-1 text-[9px] font-bold uppercase text-blue-300">
                  POTENTIAL REVENUE IMPACT: ${potentialRevenueImpact.toLocaleString()}
                </span>
                {coreintelTrendActive && (
                  <span className="rounded border border-amber-500/70 bg-amber-500/10 px-2 py-1 text-[9px] font-bold uppercase text-amber-300">
                    COREINTEL ADJUSTMENT: MEDSHIELD AT-RISK REVENUE +15%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <section className="border-b border-slate-800 bg-slate-900/35 px-4 py-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-white">RECENT VENDOR SUBMISSIONS</h2>
            <span className="text-[9px] uppercase text-slate-400">Historical Audit Trail</span>
          </div>

          <div className="overflow-x-auto rounded border border-slate-800">
            <table className="w-full text-[10px] text-slate-200">
              <thead className="border-b border-slate-800 bg-slate-950/80">
                <tr>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-300">VENDOR</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-300">SUBMISSION DATE</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-300">AUDITOR</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-300">PREVIOUS SCORE</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-300">NEW SCORE</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-300">CHANGE</th>
                </tr>
              </thead>
              <tbody>
                {recentSubmissions.length === 0 ? (
                  <tr className="border-b border-slate-800 bg-slate-900/20">
                    <td colSpan={6} className="px-3 py-3 text-center text-[10px] text-slate-400">
                      No submissions recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentSubmissions.map((submission) => {
                    const isPositive = submission.scoreChange >= 0;

                    return (
                      <tr key={submission.id} className="border-b border-slate-800 bg-slate-900/20">
                        <td className="px-3 py-2 font-semibold text-white">{submission.vendorName}</td>
                        <td className="px-3 py-2 text-slate-300">{new Date(submission.createdAt).toISOString().slice(0, 10)}</td>
                        <td className="px-3 py-2 text-slate-300">{submission.auditor}</td>
                        <td className="px-3 py-2 text-slate-300">{submission.previousScore}</td>
                        <td className="px-3 py-2 text-slate-300">{submission.score}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded border px-2 py-0.5 text-[9px] font-bold ${
                              isPositive
                                ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-300"
                                : "border-red-500/70 bg-red-500/15 text-red-300"
                            }`}
                          >
                            {isPositive ? `+${submission.scoreChange}` : submission.scoreChange}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

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
