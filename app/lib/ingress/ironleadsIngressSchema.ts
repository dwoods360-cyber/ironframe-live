import { z } from 'zod';

export const IRONLEADS_BEACHHEAD_SECTORS = [
  'REGIONAL_BHC',
  'UTILITY_NERC',
  'MSSP_ENCLAVE',
  'HEALTH_HIPAA',
] as const;

export const ironleadsIngressSchema = z.object({
  companyName: z.string().min(2).max(255),
  industrySector: z.enum(IRONLEADS_BEACHHEAD_SECTORS),
  detectedTrigger: z.string().min(2).max(120),
  targetTenantSlug: z.string().min(2).max(63),
  contactEmail: z.string().email().max(320).optional(),
  contactName: z.string().min(2).max(200).optional(),
  accountDomain: z.string().min(3).max(255).optional(),
});

export type IronleadsIngressPayload = z.infer<typeof ironleadsIngressSchema>;
