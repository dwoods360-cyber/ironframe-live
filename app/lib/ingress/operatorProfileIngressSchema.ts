import { z } from "zod";

export const OPERATOR_PROFILE_SCHEMA_VERSION = "operator-profile-v1" as const;

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? undefined : value))
    .optional();

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .transform((value) => (value === "" ? undefined : value))
  .optional()
  .refine((value) => value === undefined || z.string().url().safeParse(value).success, {
    message: "avatar URL must be valid",
  });

export const operatorProfileIngressSchema = z.object({
  schemaVersion: z.literal(OPERATOR_PROFILE_SCHEMA_VERSION),
  operatorId: z.string().uuid(),
  title: optionalTrimmed(120),
  phone: optionalTrimmed(32),
  avatarUrl: optionalUrl,
});

export type OperatorProfileIngressPayload = z.infer<typeof operatorProfileIngressSchema>;
