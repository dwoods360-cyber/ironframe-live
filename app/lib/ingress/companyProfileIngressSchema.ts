import { z } from 'zod';

export const COMPANY_PROFILE_SCHEMA_VERSION = 'company-profile-v1' as const;

const digitStringCents = z
  .string()
  .regex(/^\d+$/, 'must be a string of pure digits (no decimals or letters)');

export const companyProfileIngressSchema = z
  .object({
    schemaVersion: z.literal(COMPANY_PROFILE_SCHEMA_VERSION),
    tenantId: z.string().uuid(),
    companyName: z.string().trim().min(1).max(150),
    sector: z.string().trim().min(1).max(100),
    industryAvgLossCents: digitStringCents.optional(),
    departments: z.array(z.string().trim().min(1).max(50)).max(32).optional(),
  })
  .superRefine((payload, ctx) => {
    if (!payload.departments?.length) return;
    const normalized = payload.departments.map((name) => name.toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'departments must contain unique names',
        path: ['departments'],
      });
    }
  });

export type CompanyProfileIngressPayload = z.infer<typeof companyProfileIngressSchema>;
