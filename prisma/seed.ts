import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging legacy data...');
  // Wipe the slate clean in the correct relational order
  await prisma.activeRisk.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.department.deleteMany();
  await prisma.company.deleteMany();

  console.log('🚀 Initiating Ironframe Baseline Seed...');

  // 1. Establish Companies (The New Tenant Boundary) with ALE Baselines
  const medshield = await prisma.company.create({
    data: { 
      name: 'Medshield Health', 
      sector: 'Healthcare', 
      industry_avg_loss: '$11.1M', 
      infrastructure_val: '$15.2M' 
    }
  });

  const vaultbank = await prisma.company.create({
    data: { 
      name: 'Vaultbank Global', 
      sector: 'Finance', 
      industry_avg_loss: '$5.9M', 
      infrastructure_val: '$42.5M' 
    }
  });

  const gridcore = await prisma.company.create({
    data: { 
      name: 'Gridcore Energy', 
      sector: 'Energy', 
      industry_avg_loss: '$4.7M', 
      infrastructure_val: '$28.4M' 
    }
  });

  // 2. Inject Policies (Agent 8 / COREINTEL Targets)
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

  // 3. Inject Initial High-Risk Findings for Dashboard Triage
  await prisma.activeRisk.createMany({
    data: [
      { company_id: medshield.id, title: 'Azure Health API Exposure', status: 'ACTIVE', score: 0.84, source: 'IronSight' },
      { company_id: gridcore.id, title: 'Schneider Electric SCADA Vulnerability', status: 'ACTIVE', score: 0.88, source: 'IronSight' },
      { company_id: vaultbank.id, title: 'Palo Alto Firewall Misconfiguration', status: 'ACTIVE', score: 0.82, source: 'CoreIntel' }
    ]
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