import { z } from "zod";

export const TENANT_CONTACT_PROFILE_SCHEMA_VERSION = "tenant-contact-profile-v1" as const;

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? undefined : value))
    .optional();

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .transform((value) => (value === "" ? undefined : value))
  .optional()
  .refine((value) => value === undefined || z.string().email().safeParse(value).success, {
    message: "billing contact email must be valid",
  });

export const tenantContactProfileIngressSchema = z.object({
  schemaVersion: z.literal(TENANT_CONTACT_PROFILE_SCHEMA_VERSION),
  tenantId: z.string().uuid(),
  corporatePhone: optionalTrimmed(32),
  addressStreet: optionalTrimmed(200),
  addressCity: optionalTrimmed(100),
  addressState: optionalTrimmed(64),
  addressZip: optionalTrimmed(20),
  addressCountry: optionalTrimmed(64),
  billingContactEmail: optionalEmail,
  taxId: optionalTrimmed(64),
});

export type TenantContactProfileIngressPayload = z.infer<
  typeof tenantContactProfileIngressSchema
>;
