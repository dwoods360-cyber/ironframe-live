/**
 * Vercel Cron and manual `curl` often POST with an empty body — `request.json()` throws
 * "Unexpected end of JSON input". Always read text first and fall back to `{}`.
 */
export async function parseCronRequestBody(request: Request): Promise<Record<string, unknown>> {
  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.trim().length > 0) {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    }
  } catch {
    /* malformed JSON or empty stream — treat as {} */
  }
  return body;
}
