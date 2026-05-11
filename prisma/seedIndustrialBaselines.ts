/**
 * Industrial GRC baseline seed: eight cross-industry tenants and one PIPELINE-stage shadow risk each.
 * Run: `npx tsx prisma/seedIndustrialBaselines.ts`
 *
 * Requires migration `20260522103000_threat_state_pipeline_enum` applied so `ThreatState.PIPELINE` exists.
 */
import { PrismaClient, ThreatState, ComplianceFramework, SimThreatSource } from "@prisma/client";

/** Stable UUIDs — Medshield / Vaultbank match `app/utils/tenantIsolation.ts` TENANT_UUIDS. */
export const INDUSTRIAL_TENANT_UUIDS = {
  defenseLogistics: "9e8d7c6b-5a4f-4321-9e8d-7c6b5a4f3210",
  fedsecure: "a0000001-0001-4001-8001-000000000001",
  horizonAero: "a0000002-0002-4002-8002-000000000002",
  metroMunicipal: "a0000003-0003-4003-8003-000000000003",
  globalCivic: "a0000004-0004-4004-8004-000000000004",
  medshield: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
  vaultbank: "c6932d16-a716-4a07-9bc4-6ec987f641e2",
  cybercore: "a0000008-0008-4008-8008-000000000008",
} as const;

const SLUG_TO_UUID: Record<string, string> = {
  "defense-logistics": INDUSTRIAL_TENANT_UUIDS.defenseLogistics,
  fedsecure: INDUSTRIAL_TENANT_UUIDS.fedsecure,
  "horizon-aero": INDUSTRIAL_TENANT_UUIDS.horizonAero,
  "metro-municipal": INDUSTRIAL_TENANT_UUIDS.metroMunicipal,
  "global-civic": INDUSTRIAL_TENANT_UUIDS.globalCivic,
  medshield: INDUSTRIAL_TENANT_UUIDS.medshield,
  vaultbank: INDUSTRIAL_TENANT_UUIDS.vaultbank,
  cybercore: INDUSTRIAL_TENANT_UUIDS.cybercore,
};

/**
 * Full industrial suite — drives tenant rows, ALE baselines, and governance multipliers (bps).
 * IDs are injected from {@link SLUG_TO_UUID} for reproducible DB rows + dropdowns.
 */
const industrialTenantSpecs = [
  {
    name: "Defense Logistics Corp",
    slug: "defense-logistics",
    industry: "DEFENSE",
    aleBaselineCents: 1_000_000_000n,
    governanceMultiplierBps: 160n,
  },
  {
    name: "FedSecure Systems",
    slug: "fedsecure",
    industry: "FEDERAL_GOVERNMENT",
    aleBaselineCents: 850_000_000n,
    governanceMultiplierBps: 140n,
  },
  {
    name: "Horizon AeroSystems",
    slug: "horizon-aero",
    industry: "AEROSPACE",
    aleBaselineCents: 1_220_000_000n,
    governanceMultiplierBps: 150n,
  },
  {
    name: "Metro Municipal Services",
    slug: "metro-municipal",
    industry: "STATE_LOCAL",
    aleBaselineCents: 310_000_000n,
    governanceMultiplierBps: 110n,
  },
  {
    name: "Global Civic Authority",
    slug: "global-civic",
    industry: "PUBLIC_SECTOR",
    aleBaselineCents: 540_000_000n,
    governanceMultiplierBps: 120n,
  },
  {
    name: "Medshield",
    slug: "medshield",
    industry: "HEALTHCARE",
    aleBaselineCents: 1_110_000_000n,
    governanceMultiplierBps: 100n,
  },
  {
    name: "Vaultbank NA",
    slug: "vaultbank",
    industry: "FINANCE",
    aleBaselineCents: 590_000_000n,
    governanceMultiplierBps: 100n,
  },
  {
    name: "Cybercore Innovations",
    slug: "cybercore",
    industry: "TECHNOLOGY",
    aleBaselineCents: 730_000_000n,
    governanceMultiplierBps: 130n,
  },
] as const;

export type IndustrialTenantSeedRow = {
  id: string;
  name: string;
  slug: string;
  industry: string;
  aleBaselineCents: bigint;
  governanceMultiplierBps: bigint;
};

export const industrialTenants: IndustrialTenantSeedRow[] = industrialTenantSpecs.map((spec) => {
  const id = SLUG_TO_UUID[spec.slug];
  if (!id) throw new Error(`seedIndustrialBaselines: missing UUID for slug "${spec.slug}"`);
  return { id, ...spec };
});

/** USD $100,000.00 liability base (cents) — uniform governed-impact scenario across industries. */
const BASE_IMPACT_CENTS = 10_000_000n;

const BASELINE_TITLE_TAG = "[Industrial Seed]";

function sectorLabelForIndustry(industry: string): string {
  const u = industry.toUpperCase();
  if (u === "DEFENSE") return "Defense & Aerospace";
  if (u === "FEDERAL_GOVERNMENT") return "Federal Government";
  if (u === "AEROSPACE") return "Aerospace";
  if (u === "STATE_LOCAL") return "State & Local Government";
  if (u === "PUBLIC_SECTOR") return "Public Sector";
  if (u === "HEALTHCARE") return "Healthcare";
  if (u === "FINANCE") return "Finance";
  if (u === "TECHNOLOGY") return "Technology";
  return industry;
}

function complianceForIndustry(industry: string): ComplianceFramework {
  const u = industry.toUpperCase();
  if (u === "DEFENSE" || u === "FEDERAL_GOVERNMENT" || u === "AEROSPACE") return ComplianceFramework.NIST;
  if (u === "HEALTHCARE") return ComplianceFramework.ISO27001;
  if (u === "FINANCE") return ComplianceFramework.SOC2;
  return ComplianceFramework.SOC2;
}

function mappedControlsForIndustry(industry: string): string[] {
  const u = industry.toUpperCase();
  if (u === "DEFENSE" || u === "FEDERAL_GOVERNMENT" || u === "AEROSPACE") return ["NIST PR.AC-3"];
  if (u === "HEALTHCARE") return ["ISO A.8.2"];
  if (u === "FINANCE") return ["SOC2 CC6.1"];
  return ["SOC2 CC7.2"];
}

function sourceAgentForIndustry(industry: string): string {
  const u = industry.toUpperCase();
  if (u === "DEFENSE") return "IRONSIGHT";
  if (u === "FINANCE") return "IRONLOCK";
  if (u === "HEALTHCARE") return "IRONCLINIC";
  if (u === "TECHNOLOGY") return "IRONFRAME";
  if (u === "AEROSPACE") return "IRONWING";
  return "IRONGATE";
}

function baselineRiskCopy(name: string, industry: string): { title: string; sourceAgent: string } {
  return {
    title: `${BASELINE_TITLE_TAG} Cross-industry intake — ${name}`,
    sourceAgent: sourceAgentForIndustry(industry),
  };
}

export async function seedIndustrialBaselines(prisma: PrismaClient): Promise<void> {
  const companyByTenant = new Map<string, { id: bigint; tenantId: string }>();

  for (const t of industrialTenants) {
    await prisma.tenant.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        name: t.name,
        slug: t.slug,
        industry: t.industry,
        ale_baseline: t.aleBaselineCents,
      },
      update: {
        name: t.name,
        slug: t.slug,
        industry: t.industry,
        ale_baseline: t.aleBaselineCents,
      },
    });

    const sector = sectorLabelForIndustry(t.industry);

    const existingCo = await prisma.company.findFirst({
      where: { tenantId: t.id, name: t.name },
      select: { id: true },
    });

    const company = existingCo
      ? await prisma.company.update({
          where: { id: existingCo.id },
          data: {
            sector,
            industry_avg_loss_cents: t.aleBaselineCents,
            infrastructure_val_cents: t.aleBaselineCents * 4n,
          },
        })
      : await prisma.company.create({
          data: {
            name: t.name,
            sector,
            industry_avg_loss_cents: t.aleBaselineCents,
            infrastructure_val_cents: t.aleBaselineCents * 4n,
            tenantId: t.id,
          },
        });

    companyByTenant.set(t.id, { id: company.id, tenantId: t.id });
  }

  await prisma.riskEvent.deleteMany({
    where: {
      tenantId: { in: industrialTenants.map((x) => x.id) },
      title: { startsWith: BASELINE_TITLE_TAG },
    },
  });

  for (const t of industrialTenants) {
    const co = companyByTenant.get(t.id);
    const copy = baselineRiskCopy(t.name, t.industry);
    if (!co) {
      throw new Error(`Missing company for tenant ${t.id}`);
    }

    const governanceMultiplierBps = t.governanceMultiplierBps;
    /** Matches Postgres `governed_impact` GENERATED: (base * mult) / 100 */
    const governedImpactCents = (BASE_IMPACT_CENTS * governanceMultiplierBps) / 100n;

    await prisma.riskEvent.create({
      data: {
        title: copy.title,
        sourceAgent: copy.sourceAgent,
        source: SimThreatSource.SYSTEM,
        score: 55,
        priority_score: 55,
        targetEntity: t.name,
        financialRisk_cents: governedImpactCents,
        baseImpactCents: BASE_IMPACT_CENTS,
        governanceImpactMultiplier: governanceMultiplierBps,
        tenantCompanyId: co.id,
        tenantId: co.tenantId,
        status: ThreatState.PIPELINE,
        severity: "MEDIUM",
        complianceFramework: complianceForIndustry(t.industry),
        mappedControls: mappedControlsForIndustry(t.industry),
        remediation_status: "PENDING",
        ingestionDetails: {
          industrialBaselineSeed: true,
          program: "INDUSTRIAL_BASELINE",
          liabilityNoteCents: BASE_IMPACT_CENTS.toString(),
        },
      },
    });
  }

  console.log(
    `Industrial baseline seed complete: ${industrialTenants.length} tenants, one ThreatState.PIPELINE risk each (baseImpactCents ${BASE_IMPACT_CENTS}).`,
  );
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await seedIndustrialBaselines(prisma);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
