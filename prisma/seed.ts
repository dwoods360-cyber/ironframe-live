import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging legacy data...');
  // Wipe the slate clean in the correct relational order
  await prisma.vendor.deleteMany(); // Added the new Vendor table purge
  await prisma.activeRisk.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.department.deleteMany();
  await prisma.company.deleteMany();

  console.log('🚀 Initiating Ironframe Baseline Seed (v1.1 TPRM)...');

  // 1. Establish Companies (The 1st Party / Tenant Boundary)
  const medshield = await prisma.company.create({
    data: { name: 'Medshield Health', sector: 'Healthcare', industry_avg_loss_cents: 1110000000n, infrastructure_val_cents: 1520000000n }
  });

  const vaultbank = await prisma.company.create({
    data: { name: 'Vaultbank Global', sector: 'Finance', industry_avg_loss_cents: 590000000n, infrastructure_val_cents: 4250000000n }
  });

  const gridcore = await prisma.company.create({
    data: { name: 'Gridcore Energy', sector: 'Energy', industry_avg_loss_cents: 470000000n, infrastructure_val_cents: 2840000000n }
  });

  // 2. Inject Policies (Agent 8 Targets)
  await prisma.policy.createMany({
    data: [
      { company_id: medshield.id, name: 'HIPAA Data Privacy', status: 'GAP DETECTED' },
      { company_id: medshield.id, name: 'Patient Access Control', status: 'COMPLIANT' },
      { company_id: vaultbank.id, name: 'SOC2 Type II Encryption', status: 'COMPLIANT' },
      { company_id: vaultbank.id, name: 'SWIFT Transaction Security', status: 'GAP DETECTED' },
      { company_id: gridcore.id, name: 'NIST 800-82 ICS Security', status: 'GAP DETECTED' },
      { company_id: gridcore.id, name: 'Physical Site Access', status: 'COMPLIANT' }
    ]
  });

  // 3. Inject Initial High-Risk Findings (Agent 4 Targets)
  await prisma.activeRisk.createMany({
    data: [
      { company_id: medshield.id, title: 'Azure Health API Exposure', status: 'ACTIVE', score: 0.84, source: 'IronSight' },
      { company_id: gridcore.id, title: 'Schneider Electric SCADA Vulnerability', status: 'ACTIVE', score: 0.88, source: 'IronSight' },
      { company_id: vaultbank.id, title: 'Palo Alto Firewall Misconfiguration', status: 'ACTIVE', score: 0.82, source: 'CoreIntel' }
    ]
  });

  // 4. Inject N-Tier Supply Chain (Agent 10 / Ironmap Targets)
  console.log('🔗 Mapping N-Tier Supply Chain...');
  
  // MedShield's 3rd Party
  const azureHealth = await prisma.vendor.create({
    data: { company_id: medshield.id, name: 'Azure Health', risk_tier: 'HIGH' }
  });

  // MedShield's 4th Party (Sub-processor mapped to Azure Health)
  await prisma.vendor.create({
    data: { 
      company_id: medshield.id, 
      name: 'KubeOps EU-West', 
      risk_tier: 'CRITICAL',
      parent_id: azureHealth.id // <-- This maps the 4th-party inheritance!
    }
  });

  // GridCore's 3rd Party
  await prisma.vendor.create({
    data: { company_id: gridcore.id, name: 'Schneider Electric', risk_tier: 'HIGH' }
  });

  // VaultBank's 3rd Party
  await prisma.vendor.create({
    data: { company_id: vaultbank.id, name: 'Palo Alto Networks', risk_tier: 'CRITICAL' }
  });

  console.log('✅ Ironframe Baseline Seed Complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });