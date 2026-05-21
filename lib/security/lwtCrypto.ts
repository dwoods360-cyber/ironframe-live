import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "lwt1:";
const ALGO = "aes-256-gcm";

function deriveKey(): Buffer {
  const raw =
    process.env.LWT_ENCRYPTION_KEY?.trim() || process.env.NOTIFICATION_ENDPOINT_SECRET?.trim();
  if (!raw || raw.length < 16) {
    throw new Error(
      "LWT_ENCRYPTION_KEY (or NOTIFICATION_ENDPOINT_SECRET) missing — required for Last Will encryption.",
    );
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

function b64e(buf: Buffer): string {
  return buf.toString("base64url");
}

function b64d(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

export function encryptLastWillPayload(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${b64e(iv)}:${b64e(tag)}:${b64e(enc)}`;
}

export function decryptLastWillPayload(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    throw new Error("Unknown LWT ciphertext format.");
  }
  const rest = stored.slice(PREFIX.length);
  const parts = rest.split(":");
  if (parts.length !== 3) throw new Error("Invalid LWT ciphertext segments.");
  const [ivS, tagS, ctS] = parts;
  const key = deriveKey();
  const iv = b64d(ivS);
  const tag = b64d(tagS);
  const ct = b64d(ctS);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
