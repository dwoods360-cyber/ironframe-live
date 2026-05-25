import { createHmac } from "crypto";

const PII_KEYS = new Set(["email", "fullname", "phonenumber", "operatorinitials"]);

/**
 * Deterministic SHA-256 HMAC anonymization for inbound PII fields.
 * Output is always 64 hex chars, safe for typical varchar/text column limits.
 */
export function anonymizePIIField(rawData: string): string {
  const pepper = process.env.INGEST_SALT_PEPPER;
  if (!pepper) {
    throw new Error("CRITICAL: INGEST_SALT_PEPPER environment variable is missing.");
  }
  return createHmac("sha256", pepper)
    .update(rawData.trim().toLowerCase())
    .digest("hex");
}

function sanitizeNode(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => sanitizeNode(item));
  }
  if (node == null || typeof node !== "object") {
    return node;
  }

  const input = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(input)) {
    if (PII_KEYS.has(k.toLowerCase())) {
      if (typeof v === "string") {
        out[k] = anonymizePIIField(v);
      } else if (v != null) {
        out[k] = anonymizePIIField(String(v));
      } else {
        out[k] = v;
      }
      continue;
    }
    out[k] = sanitizeNode(v);
  }

  return out;
}

/** Deeply sanitizes inbound ingress payloads before Irongate validation / routing. */
export function sanitizeIngressPayload<T>(payload: T): T {
  return sanitizeNode(payload) as T;
}
