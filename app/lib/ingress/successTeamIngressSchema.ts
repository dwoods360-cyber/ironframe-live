import { z } from "zod";

import { CORE_BEACHHEAD_SECTORS } from "@/lib/crm/leadPrioritization";

export const successTeamAccountsQuerySchema = z.object({
  tenantSlug: z.string().trim().min(1).max(63),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const successTeamHealthSnapshotQuerySchema = z.object({
  tenantSlug: z.string().trim().min(1).max(63),
  dealId: z.string().uuid(),
});

export const successTeamAdvisorySchema = z.object({
  tenantSlug: z.string().trim().min(1).max(63),
  dealId: z.string().uuid(),
  contactId: z.string().uuid(),
  advisoryType: z.enum(["RETENTION", "EXPANSION", "QBR", "ONBOARDING", "CHECK_IN"]),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(20).max(12_000),
  industrySector: z.enum(CORE_BEACHHEAD_SECTORS),
  healthScore: z.coerce.number().int().min(0).max(100),
  healthBand: z.enum(["healthy", "watch", "at_risk", "critical"]),
  valueCents: z.string().regex(/^\d+$/).optional(),
  corpusPlayIds: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
});

export type SuccessTeamAccountsQuery = z.infer<typeof successTeamAccountsQuerySchema>;
export type SuccessTeamHealthSnapshotQuery = z.infer<typeof successTeamHealthSnapshotQuerySchema>;
export type SuccessTeamAdvisoryPayload = z.infer<typeof successTeamAdvisorySchema>;
