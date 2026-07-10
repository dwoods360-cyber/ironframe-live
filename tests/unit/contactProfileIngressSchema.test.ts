/**
 * Tenant contact + operator profile ingress schema validation.
 */
import { describe, it, expect } from "vitest";
import {
  TENANT_CONTACT_PROFILE_SCHEMA_VERSION,
  tenantContactProfileIngressSchema,
} from "@/app/lib/ingress/tenantContactProfileIngressSchema";
import {
  OPERATOR_PROFILE_SCHEMA_VERSION,
  operatorProfileIngressSchema,
} from "@/app/lib/ingress/operatorProfileIngressSchema";

const TENANT = "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";
const OPERATOR = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

describe("tenantContactProfileIngressSchema", () => {
  it("accepts a valid corporate contact payload", () => {
    const result = tenantContactProfileIngressSchema.safeParse({
      schemaVersion: TENANT_CONTACT_PROFILE_SCHEMA_VERSION,
      tenantId: TENANT,
      corporatePhone: "+1 555-0100",
      addressStreet: "100 Main St",
      addressCity: "Austin",
      addressState: "TX",
      addressZip: "78701",
      addressCountry: "US",
      billingContactEmail: "billing@example.com",
      taxId: "12-3456789",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid billing contact email", () => {
    const result = tenantContactProfileIngressSchema.safeParse({
      schemaVersion: TENANT_CONTACT_PROFILE_SCHEMA_VERSION,
      tenantId: TENANT,
      billingContactEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("coerces empty strings to undefined optional fields", () => {
    const result = tenantContactProfileIngressSchema.safeParse({
      schemaVersion: TENANT_CONTACT_PROFILE_SCHEMA_VERSION,
      tenantId: TENANT,
      corporatePhone: "",
      taxId: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.corporatePhone).toBeUndefined();
      expect(result.data.taxId).toBeUndefined();
    }
  });
});

describe("operatorProfileIngressSchema", () => {
  it("accepts a valid operator profile payload", () => {
    const result = operatorProfileIngressSchema.safeParse({
      schemaVersion: OPERATOR_PROFILE_SCHEMA_VERSION,
      operatorId: OPERATOR,
      title: "GRC Manager",
      phone: "+1 555-0199",
      avatarUrl: "https://cdn.example.com/avatar.png",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid avatar URL", () => {
    const result = operatorProfileIngressSchema.safeParse({
      schemaVersion: OPERATOR_PROFILE_SCHEMA_VERSION,
      operatorId: OPERATOR,
      avatarUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});
