type FingerprintPayload = {
  sha256?: string;
  sha256Short?: string;
};

const TAS_FINGERPRINT_TTL_MS = 60_000;

let cachedFingerprint: FingerprintPayload | null = null;
let cachedAtMs = 0;
let inFlight: Promise<FingerprintPayload | null> | null = null;

function isFresh(nowMs: number): boolean {
  return cachedFingerprint != null && nowMs - cachedAtMs < TAS_FINGERPRINT_TTL_MS;
}

export async function getTasFingerprintThrottled(): Promise<FingerprintPayload | null> {
  const now = Date.now();
  if (isFresh(now)) return cachedFingerprint;
  if (inFlight) return inFlight;

  inFlight = fetch("/api/grc/tas-fingerprint", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((json: FingerprintPayload | null) => {
      if (!json) return null;
      cachedFingerprint = json;
      cachedAtMs = Date.now();
      return json;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
