export type PkiSignatureRole = "VAULT_RELEASE" | "CISO_HANDSHAKE";

const PEM_BEGIN = "-----BEGIN PUBLIC KEY-----";
const PEM_END = "-----END PUBLIC KEY-----";

/** Thrown when a configured env PEM is non-empty but not valid SPKI armor (production-safe). */
export class VaultPublicKeyConfigError extends Error {
  constructor(
    public readonly envKey: string,
    detail: string,
  ) {
    super(`VAULT_PUBLIC_KEY_CONFIG [${envKey}]: ${detail}`);
    this.name = "VaultPublicKeyConfigError";
  }
}

const ROLE_ENV_PRIORITY: Record<PkiSignatureRole, string[]> = {
  VAULT_RELEASE: [
    "PUBLIC_KEY_VAULT_PEM",
    "PUBLIC_KEY_VAULT_RELEASE",
    "PUBLIC_KEY_VAULT_KEY_2026",
    "PUBLIC_KEY",
    "VAULT_SUPERVISOR_PUBLIC_KEY",
  ],
  CISO_HANDSHAKE: [
    "PUBLIC_KEY_CISO_PEM",
    "PUBLIC_KEY_CISO_HANDSHAKE",
    "PUBLIC_KEY",
  ],
};

export function normalizeVaultPublicKeyPem(raw: string): string {
  return raw.replace(/\\n/g, "\n").trim();
}

export function isValidSpkiPublicKeyPem(pem: string): boolean {
  const normalized = normalizeVaultPublicKeyPem(pem);
  return normalized.includes(PEM_BEGIN) && normalized.includes(PEM_END);
}

function strictVaultPemConfig(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    process.env.VAULT_PUBLIC_KEY_STRICT === "1"
  );
}

/**
 * Reads a single env var as SPKI PEM. Empty → null. Malformed → null in dev/test;
 * throws {@link VaultPublicKeyConfigError} in production/Vercel when value is set.
 */
export function readVaultPublicKeyFromEnv(envKey: string): string | null {
  const raw = process.env[envKey]?.trim();
  if (!raw) return null;

  const normalized = normalizeVaultPublicKeyPem(raw);
  if (!isValidSpkiPublicKeyPem(normalized)) {
    if (strictVaultPemConfig()) {
      throw new VaultPublicKeyConfigError(
        envKey,
        "Malformed or truncated PEM — expected -----BEGIN PUBLIC KEY----- and -----END PUBLIC KEY-----.",
      );
    }
    return null;
  }
  return normalized;
}

/** Production-first resolver for Epic 11 dual-gate role keys. */
export function resolveVaultRolePublicKeyPem(role: PkiSignatureRole): string | null {
  for (const envKey of ROLE_ENV_PRIORITY[role]) {
    const pem = readVaultPublicKeyFromEnv(envKey);
    if (pem) return pem;
  }
  return null;
}

/** Resolve PEM from inline SPKI or `PUBLIC_KEY_<NORMALIZED_ID>` with production aliases. */
export function resolveVaultPublicKeyPem(publicKeyOrId: string): string | null {
  const trimmed = publicKeyOrId.trim();
  if (!trimmed) return null;

  if (isValidSpkiPublicKeyPem(trimmed)) {
    return normalizeVaultPublicKeyPem(trimmed);
  }

  const normalizedId = trimmed.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase();
  const fromId = readVaultPublicKeyFromEnv(`PUBLIC_KEY_${normalizedId}`);
  if (fromId) return fromId;

  return resolveVaultRolePublicKeyPem("VAULT_RELEASE");
}
