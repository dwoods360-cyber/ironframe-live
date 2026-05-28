import { createHmac } from "crypto";

/** Epic 14 / Ironethic (Agent 18) — keys hashed before Irongate or persistence (case-insensitive). */
const PII_KEYS = new Set(["email", "fullname", "phonenumber", "operatorinitials"]);

export const INGEST_SALT_PEPPER_MISSING =
  "CRITICAL: INGEST_SALT_PEPPER environment variable is missing.";

/**
 * Deterministic SHA-256 HMAC anonymization for inbound PII fields.
 * Output is always 64 hex chars, safe for typical varchar/text column limits.
 */
export function anonymizePIIField(rawData: string): string {
  const pepper = process.env.INGEST_SALT_PEPPER?.trim();
  if (!pepper) {
    throw new Error(INGEST_SALT_PEPPER_MISSING);
  }
  return createHmac("sha256", pepper).update(rawData.trim().toLowerCase()).digest("hex");
}

function sanitizeNode(node: unknown): unknown {
  if (typeof node === "bigint") {
    return node;
  }
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

/** Deeply sanitizes inbound ingress payloads before Irongate validation / routing / persistence. */
export function sanitizeIngressPayload<T>(payload: T): T {
  return sanitizeNode(payload) as T;
}

/** Sanitize JSON stored in string columns (`ingestionDetails`, DMZ detail blobs). */
export function sanitizeIngressJsonString(raw: string | null | undefined): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return JSON.stringify(sanitizeIngressPayload(parsed));
  } catch {
    return raw;
  }
}

export function isIngestSaltPepperError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("INGEST_SALT_PEPPER");
}

/** Fail-closed HTTP 500 envelope when pepper is absent (Epic 14 boundary). */
export function ingressSanitizerFailureResponse(
  err: unknown,
): { status: 500; body: { error: string } } | null {
  if (!isIngestSaltPepperError(err)) {
    return null;
  }
  const message = err instanceof Error ? err.message : INGEST_SALT_PEPPER_MISSING;
  return { status: 500, body: { error: message } };
}

export function assertIngressSaltPepperConfigured(): void {
  if (!process.env.INGEST_SALT_PEPPER?.trim()) {
    throw new Error(INGEST_SALT_PEPPER_MISSING);
  }
}
