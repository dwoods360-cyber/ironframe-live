import { z } from 'zod';

import type { ProspectRecord } from '../lib/crmPollClient.js';
import type { OutreachChannel } from '../loadSalesTeamEnv.js';

export const SalesTeamStateSchema = z.object({
  runId: z.string(),
  prospects: z.array(z.custom<ProspectRecord>()),
  newProspectIds: z.array(z.string()),
  drafts: z.array(
    z.object({
      dealId: z.string(),
      contactId: z.string(),
      channel: z.custom<OutreachChannel>(),
      subject: z.string(),
      body: z.string(),
      industrySector: z.string(),
      lossExposureCents: z.string(),
      interactionId: z.string().optional(),
      shipped: z.boolean(),
      error: z.string().optional(),
    }),
  ),
  pipelineLog: z.array(z.string()),
  error: z.string().nullable(),
});

export type SalesTeamGraphState = z.infer<typeof SalesTeamStateSchema>;

export type SalesTeamPipelineInput = {
  threadId?: string;
  limit?: number;
};
