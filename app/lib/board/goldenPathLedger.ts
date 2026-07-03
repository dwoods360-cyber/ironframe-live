import "server-only";

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { z } from "zod";

export const GOLDEN_PATH_STOPS = [
  "STOP_0_ENV_PREREQS",
  "STOP_1_PROVISIONED",
  "STOP_2_ACTIVATED",
  "STOP_3_ALE_COMMITTED",
  "STOP_4_INTEGRITY_OK",
  "STOP_4B_REVOKE_VERIFIED",
  "STOP_5_EXPORT_OK",
  "STOP_6_GTM_VERIFIED",
] as const;

export type GoldenPathStop = (typeof GOLDEN_PATH_STOPS)[number];

const goldenPathStopSchema = z.enum(GOLDEN_PATH_STOPS);

const completedRunSchema = z.object({
  runId: z.string().trim().min(1),
  outcome: z.enum(["PASS", "FAIL"]),
  lastExecutedStop: goldenPathStopSchema,
  recordedAt: z.string().trim().min(1),
  notes: z.string().trim().optional(),
});

const activeRunSchema = z.object({
  runId: z.string().trim().min(1),
  lastExecutedStop: goldenPathStopSchema,
  operator: z.string().trim().optional(),
  startedAt: z.string().trim().optional(),
  updatedAt: z.string().trim().optional(),
});

const goldenPathLedgerSchema = z.object({
  version: z.literal(1),
  goldenPathConsecutivePasses: z.number().int().min(0).max(99),
  activeRun: activeRunSchema.nullable(),
  completedRuns: z.array(completedRunSchema),
});

export type GoldenPathLedger = z.infer<typeof goldenPathLedgerSchema>;

const LEDGER_PATH = join(process.cwd(), "storage", "constitutional", "golden-path-ledger.json");

const DEFAULT_LEDGER: GoldenPathLedger = {
  version: 1,
  goldenPathConsecutivePasses: 0,
  activeRun: {
    runId: "run2",
    lastExecutedStop: "STOP_3_ALE_COMMITTED",
    operator: "Dereck",
    startedAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
  },
  completedRuns: [
    {
      runId: "run1",
      outcome: "FAIL",
      lastExecutedStop: "STOP_4_INTEGRITY_OK",
      recordedAt: "2026-06-29",
      notes: "Stop 5 export stub; billing PENDING",
    },
  ],
};

export function readGoldenPathLedgerSync(): GoldenPathLedger {
  try {
    if (!existsSync(LEDGER_PATH)) return DEFAULT_LEDGER;
    const parsed = goldenPathLedgerSchema.safeParse(
      JSON.parse(readFileSync(LEDGER_PATH, "utf8")) as unknown,
    );
    return parsed.success ? parsed.data : DEFAULT_LEDGER;
  } catch {
    return DEFAULT_LEDGER;
  }
}

export function resolveGoldenPathLedgerPath(): string {
  return LEDGER_PATH;
}
