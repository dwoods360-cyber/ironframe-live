import { IronGate } from "./irongate-sanitizer";

type IngressSource = "API" | "WEBHOOK" | "DOC_PARSER";

function normalizeIngressEnvelope(raw: unknown): {
  tenant_id: string;
  source_type: IngressSource;
  raw_data: Record<string, unknown>;
} {
  const o =
    raw != null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const tenant_id =
    typeof o.tenant_id === "string"
      ? o.tenant_id
      : typeof o.tenantId === "string"
        ? o.tenantId
        : "";
  const source_type: IngressSource =
    o.source_type === "WEBHOOK" || o.source_type === "DOC_PARSER"
      ? o.source_type
      : "API";
  const nested =
    o.raw_data != null && typeof o.raw_data === "object"
      ? (o.raw_data as Record<string, unknown>)
      : o.sanitizedPayload != null && typeof o.sanitizedPayload === "object"
        ? (o.sanitizedPayload as Record<string, unknown>)
        : null;
  const raw_data = nested ?? o;
  return { tenant_id, source_type, raw_data };
}

export type IrongateSanitizedPayload = Record<string, unknown> & {
  tenantId: string;
  tenant_id: string;
};

/**
 * Epic 10.2 — Irongate DMZ: schema validation, sanitization, mandatory tenant stamp.
 */
export async function irongateSanitize(
  rawPayload: unknown,
): Promise<IrongateSanitizedPayload> {
  const envelope = normalizeIngressEnvelope(rawPayload);
  if (!envelope.tenant_id) {
    throw new Error("CRITICAL_SECURITY_VIOLATION: Missing Tenant Stamp");
  }

  const result = await IronGate.ingest({
    tenant_id: envelope.tenant_id,
    source_type: envelope.source_type,
    raw_data: envelope.raw_data,
  });

  return {
    ...result.data,
    tenant_id: result.tenant_id,
    tenantId: result.tenant_id,
  };
}
