/**
 * Client aborted fetch / dropped TCP — avoid treating as application errors in route handlers.
 */
export function isClientDisconnectError(e: unknown): boolean {
  if (e == null) return false;
  if (e instanceof DOMException && e.name === "AbortError") return true;
  if (typeof e !== "object" && typeof e !== "string") return false;
  const name = typeof e === "object" && e !== null && "name" in e ? String((e as Error).name) : "";
  const code =
    typeof e === "object" && e !== null && "code" in e
      ? String((e as { code?: string }).code ?? "")
      : "";
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    name === "AbortError" ||
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    code === "ECANCELED" ||
    msg.includes("aborted") ||
    msg.includes("econnreset") ||
    msg.includes("socket hang up") ||
    msg.includes("cancelled") ||
    msg.includes("canceled") ||
    msg.includes("closed") ||
    msg.includes("broken pipe")
  );
}
