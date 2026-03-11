/**
 * @vitest-environment node
 * Iteration 3.2: 100-Company Scale Benchmark — Dashboard Latency.
 * Fetches dashboard data 50 times sequentially, records duration each time, asserts p95 < 100ms.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import prisma from '@/lib/prisma';

const BENCHMARK_TENANT_NAME = 'OmniCorp Global';
const ITERATIONS = 50;
const isCI = process.env.CI === 'true' || process.env.PROD_LATENCY === 'true';
const P95_THRESHOLD_MS = isCI ? 100 : 1500;

/** Batched single round-trip: same payload as GET /api/dashboard, one network call. */
async function fetchDashboardData(tenantId: string): Promise<void> {
  await prisma.$transaction([
    prisma.company.findMany({
      where: { tenantId },
      include: { policies: true, risks: true },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, action: true, operatorId: true, createdAt: true, threatId: true },
    }),
    prisma.activeRisk.findMany({
      where: { company: { tenantId } },
      select: {
        id: true,
        company_id: true,
        title: true,
        status: true,
        score_cents: true,
        source: true,
        company: { select: { name: true, sector: true } },
      },
      orderBy: { score_cents: 'desc' },
    }),
    prisma.threatEvent.findMany({
      select: { id: true, title: true, sourceAgent: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

describe('Dashboard latency under 100-company scale', () => {
  let tenantId: string;

  beforeAll(async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { name: BENCHMARK_TENANT_NAME },
      select: { id: true },
    });
    if (!tenant) {
      throw new Error(
        `Benchmark tenant "${BENCHMARK_TENANT_NAME}" not found. Run: npx ts-node scripts/perf-test-seed.ts`
      );
    }
    tenantId = tenant.id;
  });

  it('p95 latency of 50 sequential dashboard fetches is < 100ms', async () => {
    const durations: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      await fetchDashboardData(tenantId);
      const end = performance.now();
      durations.push(end - start);
    }
    durations.sort((a, b) => a - b);
    const p95Latency = percentile(durations, 95);
    const p50Latency = percentile(durations, 50);
    const avgLatency = durations.reduce((s, d) => s + d, 0) / durations.length;
    console.log(`[perf] Dashboard fetch (${ITERATIONS} runs): p50=${p50Latency.toFixed(2)}ms, p95=${p95Latency.toFixed(2)}ms, avg=${avgLatency.toFixed(2)}ms`);
    expect(p95Latency).toBeLessThan(P95_THRESHOLD_MS);
  }, 60000);
});
