export type ParsedJsonResponse<T> =
  | { ok: true; data: T; response: Response }
  | { ok: false; error: string; response: Response };

/**
 * Safely parse a fetch Response as JSON — avoids opaque "Unexpected end of JSON input"
 * when middleware redirects, proxies return empty bodies, or handlers throw before writing JSON.
 */
export async function parseJsonResponse<T>(response: Response): Promise<ParsedJsonResponse<T>> {
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  if (!raw.trim()) {
    if (response.redirected && response.url.includes("/login")) {
      return {
        ok: false,
        error: "Session expired — sign in again to load this console.",
        response,
      };
    }
    return {
      ok: false,
      error: `Empty response from server (${response.status}).`,
      response,
    };
  }

  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      error: `Unexpected response type (${response.status}).`,
      response,
    };
  }

  try {
    return { ok: true, data: JSON.parse(raw) as T, response };
  } catch {
    return {
      ok: false,
      error: `Invalid JSON from server (${response.status}).`,
      response,
    };
  }
}
