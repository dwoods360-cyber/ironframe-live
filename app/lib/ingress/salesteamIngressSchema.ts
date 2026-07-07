import { z } from "zod";

import { CORE_BEACHHEAD_SECTORS } from "@/lib/crm/leadPrioritization";

export const salesteamProspectsQuerySchema = z.object({
  tenantSlug: z.string().trim().min(1).max(63),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const salesteamOutreachSchema = z.object({
  tenantSlug: z.string().trim().min(1).max(63),
  dealId: z.string().uuid(),
  contactId: z.string().uuid(),
  channel: z.enum(["EMAIL", "SMS"]),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(20).max(12_000),
  industrySector: z.enum(CORE_BEACHHEAD_SECTORS),
  lossExposureCents: z.string().regex(/^\d+$/).optional(),
});

export type SalesteamProspectsQuery = z.infer<typeof salesteamProspectsQuerySchema>;
export type SalesteamOutreachPayload = z.infer<typeof salesteamOutreachSchema>;
