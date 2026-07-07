import { z } from "zod";

export const supportTeamTicketsQuerySchema = z.object({
  tenantSlug: z.string().trim().min(1).max(63),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const supportTeamContextSnapshotQuerySchema = z.object({
  tenantSlug: z.string().trim().min(1).max(63),
});

export const supportTeamReplySchema = z.object({
  tenantSlug: z.string().trim().min(1).max(63),
  intakeInteractionId: z.string().uuid(),
  contactId: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(20).max(12_000),
  severityTier: z.enum(["T1_CRITICAL", "T2_ELEVATED", "T3_ROUTINE"]),
  corpusPlayIds: z.array(z.string().trim().min(1).max(64)).max(12).optional(),
});

export type SupportTeamTicketsQuery = z.infer<typeof supportTeamTicketsQuerySchema>;
export type SupportTeamContextSnapshotQuery = z.infer<typeof supportTeamContextSnapshotQuerySchema>;
export type SupportTeamReplyPayload = z.infer<typeof supportTeamReplySchema>;
