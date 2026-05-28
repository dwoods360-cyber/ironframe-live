import { createVerify } from "node:crypto";

export type PkiSignatureRole = "VAULT_RELEASE" | "CISO_HANDSHAKE";

export const PKI_VERIFICATION_GUARD_ERROR = "PKI_VERIFICATION_GUARD: Asymmetric attestation failed closed.";

const ROLE_ENV_KEYS: Record<PkiSignatureRole, string> = {
  VAULT_RELEASE: "PUBLIC_KEY_VAULT_RELEASE",
  CISO_HANDSHAKE: "PUBLIC_KEY_CISO_HANDSHAKE",
};

export type TenantBoundAsymmetricVerifyInput = {
  role: PkiSignatureRole;
  tenantUuid: string;
  entityId: string;
  message: string;
  signature: string;
  /** Vault telemetry — integer cents only when supplied */
  financialRiskCents?: bigint;
  /** Explicit PEM (SPKI) overrides configured role env when present */
  publicKeyPemOverride?: string;
};

export class PkiVerificationGuardError extends Error {
  constructor(message: string = PKI_VERIFICATION_GUARD_ERROR) {
    super(message);
    this.name = "PkiVerificationGuardError";
  }
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidPemPublicKey(pem: string): boolean {
  return pem.includes("BEGIN PUBLIC KEY");
}

/** Resolve configured PEM for Epic 11 role keys (fail-closed when missing or malformed). */
export function resolvePkiPublicKeyPem(role: PkiSignatureRole): string | null {
  const envKey = ROLE_ENV_KEYS[role];
  const raw = process.env[envKey]?.trim();
  if (!raw || !isValidPemPublicKey(raw)) {
    return null;
  }
  return raw;
}

function resolveVerificationPem(input: TenantBoundAsymmetricVerifyInput): string | null {
  const override = input.publicKeyPemOverride?.trim();
  if (override && isValidPemPublicKey(override)) {
    return override;
  }
  return resolvePkiPublicKeyPem(input.role);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tenant UUID must bound the payload before expensive signature verification. */
export function tenantBoundsPayloadMessage(
  tenantUuid: string,
  entityId: string,
  message: string,
): boolean {
  const tenant = tenantUuid.trim();
  const entity = entityId.trim();
  const msg = message.trim();
  if (!tenant || !entity || !msg) {
    return false;
  }

  const parts = msg.split(":");
  if (parts.length >= 3 && UUID_RE.test(parts[1].trim())) {
    return parts[0].trim() === entity && parts[1].trim() === tenant;
  }

  return parts[0]?.trim() === entity;
}

function assertBigIntCentsOnly(value: bigint | undefined): boolean {
  if (value === undefined) {
    return true;
  }
  return typeof value === "bigint";
}

/**
 * Epic 11 — fail-closed RSA-SHA256 verification using native Node `crypto`.
 * Returns `false` when keys, tenant bounds, or signatures are invalid.
 */
export function verifyTenantBoundAsymmetricSignature(
  input: TenantBoundAsymmetricVerifyInput,
): boolean {
  if (!assertBigIntCentsOnly(input.financialRiskCents)) {
    return false;
  }

  const signature = input.signature.trim();
  const message = input.message.trim();
  if (!hasNonEmptyString(signature) || !hasNonEmptyString(message)) {
    return false;
  }

  if (!tenantBoundsPayloadMessage(input.tenantUuid, input.entityId, message)) {
    return false;
  }

  const pem = resolveVerificationPem(input);
  if (!pem) {
    return false;
  }

  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(message, "utf8");
    verifier.end();
    return verifier.verify(pem, signature, "base64");
  } catch {
    return false;
  }
}

/** Throws `PkiVerificationGuardError` when verification fails (uncatchable GRC guard). */
export function assertTenantBoundAsymmetricSignature(input: TenantBoundAsymmetricVerifyInput): void {
  if (!verifyTenantBoundAsymmetricSignature(input)) {
    throw new PkiVerificationGuardError();
  }
}
