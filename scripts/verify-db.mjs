/**
 * Master Test Execution - DB verification script.
 * Run after stopping dev server: node scripts/verify-db.mjs
 * Requires: DATABASE_URL in .env
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}
loadEnv();

const prisma = new PrismaClient();

async function main() {
  console.log('=== DB Verification (Master Test Execution) ===\n');

  const [auditBefore, risksBefore, threatsBefore] = await Promise.all([
    prisma.auditLog.count(),
    prisma.activeRisk.count(),
    prisma.threatEvent.count(),
  ]);
  console.log('Before purge: audit_logs:', auditBefore, 'active_risks:', risksBefore, 'threat_events:', threatsBefore);

  await prisma.auditLog.deleteMany({});
  await prisma.workNote.deleteMany({});
  await prisma.threatEvent.deleteMany({});
  await prisma.activeRisk.deleteMany({});
  await prisma.policy.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.company.deleteMany({});

  const [auditAfter, risksAfter, threatsAfter] = await Promise.all([
    prisma.auditLog.count(),
    prisma.activeRisk.count(),
    prisma.threatEvent.count(),
  ]);
  console.log('After purge: audit_logs:', auditAfter, 'active_risks:', risksAfter, 'threat_events:', threatsAfter);

  const ok = auditAfter === 0 && risksAfter === 0 && threatsAfter === 0;
  if (ok) console.log('\n[PASS] Database purge verified.');
  else process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
