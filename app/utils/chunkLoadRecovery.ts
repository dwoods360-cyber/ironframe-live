const CHUNK_RELOAD_SESSION_KEY = "ironframe-chunk-reload-once";

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`;
  }
  if (typeof error === "string") return error;
  return String(error ?? "");
}

/** Stale JS after deploy/HMR — chunk load failures. */
export function isChunkLoadError(error: unknown): boolean {
  const text = errorText(error);
  if (/chunkloaderror|loading chunk \d+ failed/i.test(text)) return true;
  if (error instanceof Error && error.name === "ChunkLoadError") return true;
  return false;
}

/**
 * Stale client after a new production deploy — Server Action id / RSC payload mismatch.
 * Common on mobile Safari keeping an old tab across deploys.
 * Next often strips the detailed message on the client and only leaves a digest.
 */
export function isStaleDeploymentClientError(error: unknown): boolean {
  const text = errorText(error);
  if (
    /failed to find server action/i.test(text) ||
    /older or newer deployment/i.test(text) ||
    (/reading ['"]workers['"]/i.test(text) && /server action|deployment/i.test(text)) ||
    /cannot read properties of undefined \(reading ['"]workers['"]\)/i.test(text) ||
    /server components render/i.test(text) ||
    /error.*server component/i.test(text)
  ) {
    return true;
  }
  // Client global-error often receives an Error with empty/generic message + digest only.
  if (
    error instanceof Error &&
    typeof (error as Error & { digest?: string }).digest === "string" &&
    (error as Error & { digest?: string }).digest!.length > 0 &&
    (!error.message || /^(an error occurred|application error)/i.test(error.message.trim()))
  ) {
    return true;
  }
  return false;
}

/** Any client/bundle drift that should hard-reload once. */
export function isRecoverableClientDriftError(error: unknown): boolean {
  return isChunkLoadError(error) || isStaleDeploymentClientError(error);
}

/**
 * One automatic hard navigation after deploy/HMR drift.
 * Uses replace + cache-buster — `reload()` alone can keep a poisoned bfcache entry on iOS.
 */
export function recoverFromChunkLoadError(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY) === "1") return false;
  sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, "1");
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("_if_recover", Date.now().toString());
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
  return true;
}

export const recoverFromClientDriftError = recoverFromChunkLoadError;
