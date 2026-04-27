import type { PrismaClient } from "@prisma/client";
import { SyntheticEmployeeStatus } from "@prisma/client";

/**
 * Clearance-tier access economics (USD **cents**).
 * Directive anchors: L5 exec $500k, L3 mid $100k, L1 entry $25k — L2/L4 linearly interpolated.
 */
export function monetaryValueCentsForClearance(clearanceLevel: number): bigint {
  if (clearanceLevel >= 5) return 50_000_000n;
  if (clearanceLevel === 4) return 30_000_000n;
  if (clearanceLevel === 3) return 10_000_000n;
  if (clearanceLevel === 2) return 6_250_000n;
  return 2_500_000n;
}

export type SyntheticPersonaSeed = {
  name: string;
  email: string;
  role: string;
  clearanceLevel: number;
  vulnerabilityScore: number;
  /** Modeled access / blast-radius (USD cents); defaults from clearance tier when omitted. */
  monetaryValueCents?: bigint;
  /** Cumulative simulated loss pool (USD cents). */
  totalLossIncurredCents?: bigint;
  /** High-value C-suite / O-band VIP — persisted as `isHardened` (lab VIP hardening flag). */
  isVip?: boolean;
};

/**
 * Level-5 "O" titles first for high-stakes modeling; remainder are canonical lab personas.
 * Access values drive Shadow Plane ordering (see `listIntegritySyntheticTargetsAction`).
 */
export const SYNTHETIC_SHADOW_PERSONAS: SyntheticPersonaSeed[] = [
  {
    name: "David Vance",
    email: "david.vance.ceo@ironframe.local",
    role: "Chief Executive Officer (CEO)",
    clearanceLevel: 5,
    vulnerabilityScore: 0.05,
    monetaryValueCents: 150_000_000n,
    totalLossIncurredCents: 150_000_000n,
    isVip: true,
  },
  {
    name: "Amelia Chen",
    email: "amelia.chen.cto@ironframe.local",
    role: "Chief Technology Officer (CTO)",
    clearanceLevel: 5,
    vulnerabilityScore: 0.08,
    monetaryValueCents: 125_000_000n,
    totalLossIncurredCents: 120_000_000n,
    isVip: true,
  },
  {
    name: "Marcus Webb",
    email: "marcus.webb.coo@ironframe.local",
    role: "Chief Operating Officer (COO)",
    clearanceLevel: 5,
    vulnerabilityScore: 0.07,
    monetaryValueCents: 110_000_000n,
    totalLossIncurredCents: 95_000_000n,
    isVip: true,
  },
  {
    name: "Jordan Ellis",
    email: "jordan.ellis.cmo@ironframe.local",
    role: "Chief Marketing Officer (CMO)",
    clearanceLevel: 4,
    vulnerabilityScore: 0.22,
    monetaryValueCents: 72_000_000n,
    totalLossIncurredCents: 55_000_000n,
    isVip: true,
  },
  {
    name: "Riley Morgan",
    email: "riley.morgan.chro@ironframe.local",
    role: "Chief Human Resources Officer (CHRO)",
    clearanceLevel: 4,
    vulnerabilityScore: 0.2,
    monetaryValueCents: 48_000_000n,
    totalLossIncurredCents: 40_000_000n,
    isVip: true,
  },
  {
    name: "Sarah Jenkins",
    email: "target-01@ironframe.local",
    role: "Finance Director",
    clearanceLevel: 5,
    vulnerabilityScore: 0.1,
  },
  {
    name: "Mike Ross",
    email: "target-02@ironframe.local",
    role: "Junior Developer",
    clearanceLevel: 2,
    vulnerabilityScore: 0.7,
  },
  {
    name: "Elena Rodriguez",
    email: "target-03@ironframe.local",
    role: "HR Manager",
    clearanceLevel: 4,
    vulnerabilityScore: 0.4,
  },
  {
    name: "James Patel",
    email: "target-04@ironframe.local",
    role: "Security Analyst",
    clearanceLevel: 3,
    vulnerabilityScore: 0.35,
  },
  {
    name: "Priya Shah",
    email: "target-05@ironframe.local",
    role: "DevOps Lead",
    clearanceLevel: 4,
    vulnerabilityScore: 0.25,
  },
  {
    name: "Luis Gomez",
    email: "target-06@ironframe.local",
    role: "Sales Executive",
    clearanceLevel: 2,
    vulnerabilityScore: 0.68,
  },
  {
    name: "Nina Kowalski",
    email: "target-07@ironframe.local",
    role: "Legal Paralegal",
    clearanceLevel: 3,
    vulnerabilityScore: 0.42,
  },
  {
    name: "Omar Haddad",
    email: "target-08@ironframe.local",
    role: "Facilities Manager",
    clearanceLevel: 2,
    vulnerabilityScore: 0.55,
  },
  {
    name: "Tessa Wu",
    email: "target-09@ironframe.local",
    role: "Marketing Lead",
    clearanceLevel: 3,
    vulnerabilityScore: 0.5,
  },
  {
    name: "Viktor Petrov",
    email: "target-10@ironframe.local",
    role: "Database Administrator",
    clearanceLevel: 5,
    vulnerabilityScore: 0.15,
  },
];

const SYNTHETIC_SEED_ROWS = SYNTHETIC_SHADOW_PERSONAS.map((p) => ({
  name: p.name,
  email: p.email,
  role: p.role,
  clearanceLevel: p.clearanceLevel,
  vulnerabilityScore: p.vulnerabilityScore,
  monetaryValue: p.monetaryValueCents ?? monetaryValueCentsForClearance(p.clearanceLevel),
  totalLossIncurred: p.totalLossIncurredCents ?? 0n,
  isHardened: Boolean(p.isVip),
  isBreached: false,
  status: SyntheticEmployeeStatus.PROTECTED,
}));

export const SYNTHETIC_SEED_ROW_COUNT = SYNTHETIC_SEED_ROWS.length;

/**
 * Replaces all `SyntheticEmployee` rows with the canonical shadow roster (idempotent).
 * Safe to call from full `prisma/seed.ts` or standalone `npx ts-node prisma/seed-synthetic.ts`.
 */
export async function seedSyntheticEmployees(prisma: PrismaClient): Promise<void> {
  await prisma.syntheticEmployee.deleteMany({});
  await prisma.syntheticEmployee.createMany({
    data: SYNTHETIC_SEED_ROWS,
  });
}

const runStandalone =
  typeof process !== "undefined" &&
  (process.argv[1]?.replace(/\\/g, "/").endsWith("seed-synthetic.ts") ||
    process.argv[1]?.replace(/\\/g, "/").endsWith("seed-synthetic.js"));

if (runStandalone) {
  void (async () => {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    try {
      await seedSyntheticEmployees(prisma);
      console.log(`✅ Seeded ${SYNTHETIC_SEED_ROWS.length} SyntheticEmployee rows.`);
    } catch (e) {
      console.error(e);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  })();
}
