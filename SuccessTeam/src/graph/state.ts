import { z } from 'zod';

import type { AccountRecord } from '../lib/accountsPollClient.js';
import type { HealthSnapshot } from '../lib/healthSnapshotClient.js';
import type { AdvisoryType } from '../lib/advisoryIngressClient.js';
import type { BeachheadSector } from '../config/beachheadSuccess.js';

export const SuccessTeamStateSchema = z.object({
  runId: z.string(),
  accounts: z.array(z.custom<AccountRecord>()),
  newAccountIds: z.array(z.string()),
  snapshots: z.record(z.custom<HealthSnapshot>()),
  advisories: z.array(
    z.object({
      dealId: z.string(),
      contactId: z.string(),
      advisoryType: z.custom<AdvisoryType>(),
      subject: z.string(),
      body: z.string(),
      industrySector: z.custom<BeachheadSector>(),
      healthScore: z.number(),
      healthBand: z.enum(['healthy', 'watch', 'at_risk', 'critical']),
      valueCents: z.string(),
      corpusPlayIds: z.array(z.string()),
      narrativeEnhanced: z.boolean(),
      interactionId: z.string().optional(),
      shipped: z.boolean().optional(),
      error: z.string().optional(),
    }),
  ),
  pipelineLog: z.array(z.string()),
  error: z.string().nullable(),
  lastKnownGoodNode: z.string().nullable(),
  lastKnownGoodCheckpointId: z.string().nullable(),
});

export type SuccessTeamGraphState = z.infer<typeof SuccessTeamStateSchema>;

export type SuccessTeamPipelineInput = {
  threadId?: string;
};
