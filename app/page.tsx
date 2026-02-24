import { PrismaClient } from '@prisma/client';
import ActiveRisks from "./components/ActiveRisks";
import AgentStream from "./components/AgentStream";
import AuditIntelligence from "./components/AuditIntelligence";
import StrategicIntel from "./components/StrategicIntel";
import ThreatPipeline from "./components/ThreatPipeline";
import DashboardAlertBanners from "./components/DashboardAlertBanners";
import GlobalHealthSummaryCard from "./components/GlobalHealthSummaryCard";

// Instantiate the Core Vault connection
const prisma = new PrismaClient();

export default async function Page() {
  // 1. Fetch live Zero-Debt Data directly from the database
  const companies = await prisma.company.findMany({
    include: {
      policies: true,
      risks: true,
    }
  });

  // 2. Dynamically calculate violations based on REAL database rows
  const activeViolations = companies.reduce((sum, company) => 
    sum + company.risks.filter(r => r.status === 'ACTIVE').length + 
          company.policies.filter(p => p.status === 'GAP DETECTED').length
  , 0);

  // 3. Map real ActiveRisks into the AgentStream format
  const liveAlerts = companies.flatMap(company => 
    company.risks.filter(r => r.status === 'ACTIVE').map(risk => ({
      id: `risk-${risk.id}`,
      type: "AGENT_ALERT" as const,
      origin: "SYSTEM" as const,
      isExternalSOC: false,
      sourceAgent: risk.source,
      title: risk.title,
      impact: `${company.name} (${company.sector}): Active risk requires triage.`,
      severityScore: Math.round(risk.score * 100),
      liabilityUsd: company.industry_avg_loss_cents ? Number(company.industry_avg_loss_cents) / 100 : 0,
      status: "OPEN" as const,
      createdAt: new Date().toISOString(),
    }))
  );

  return (
    <div className="flex h-full overflow-hidden bg-slate-950">
      <aside className="w-80 shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-950">
        <StrategicIntel 
          agentHealth={{ agentManager: "HEALTHY", ironsight: "HEALTHY", coreintel: "HEALTHY" }} 
          phoneHomeAlert={null} 
          coreintelLiveFeed={["System Online. Core Vault synced.", "Zero-Trust Architecture enforced."]} 
        />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto border-r border-slate-800 bg-slate-950 p-0">
      <DashboardAlertBanners phoneHomeAlert={null} regulatoryState={{ feed: [], vendorRegulatoryFeed: [], ticker: [], isSyncing: false }} />

        {/* Note: We will need to update this component's internal logic next */}
        <GlobalHealthSummaryCard 
          aggregateEntityData={{}} 
          activeViolations={activeViolations} 
          potentialRevenueImpact={0} 
          coreintelTrendActive={false} 
        />

        <ThreatPipeline supplyChainThreat={null} showSocStream={true} />
        <ActiveRisks />
      </section>

      <aside className="w-80 shrink-0 overflow-y-auto bg-slate-950 p-3">
        <AgentStream 
          alerts={liveAlerts} 
          socIntakeEnabled={true} 
        />
        <AuditIntelligence />
      </aside>
    </div>
  );
}