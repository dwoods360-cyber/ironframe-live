const CHUNK_RELOAD_SESSION_KEY = "ironframe-chunk-reload-once";

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    const message = typeof error === "string" ? error : String(error ?? "");
    return /chunkloaderror|loading chunk \d+ failed/i.test(message);
  }
  return (
    error.name === "ChunkLoadError" ||
    /chunkloaderror|loading chunk \d+ failed/i.test(error.message)
  );
}

/** One automatic hard reload after deploy/HMR chunk drift (dev and preview). */
export function recoverFromChunkLoadError(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY) === "1") return false;
  sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, "1");
  window.location.reload();
  return true;
}
