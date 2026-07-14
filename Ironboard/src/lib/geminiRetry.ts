export type GeminiRetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
};

export type GeminiStreamFaultKind =
  | "missing_key"
  | "auth"
  | "quota"
  | "model"
  | "network"
  | "abort"
  | "tool_config"
  | "unknown";

export type GeminiStreamFault = {
  kind: GeminiStreamFaultKind;
  /** Operator-facing SSE token — actionable, never a raw stack dump. */
  operatorMessage: string;
  /** Compact log excerpt. */
  logDetail: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? error);
  }
  return String(error ?? "");
}

function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

export function isGeminiRateLimitError(error: unknown): boolean {
  if (!error) return false;
  const status = errorStatus(error);
  if (status === 429) return true;
  const message = errorMessage(error);
  return /429|RESOURCE_EXHAUSTED|quota exceeded|rate.?limit/i.test(message);
}

export function isGeminiAuthError(error: unknown): boolean {
  const status = errorStatus(error);
  if (status === 401 || status === 403) return true;
  return /API[_ ]?KEY[_ ]?INVALID|PERMISSION_DENIED|invalid api key|unauthenticated|unauthorized|API key not valid/i.test(
    errorMessage(error),
  );
}

export function isGeminiModelError(error: unknown): boolean {
  const status = errorStatus(error);
  if (status === 404) return true;
  return /NOT_FOUND|model .+ not found|is not found|Unsupported model|invalid model/i.test(
    errorMessage(error),
  );
}

export function isGeminiNetworkError(error: unknown): boolean {
  const message = errorMessage(error);
  return /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up|network|UND_ERR/i.test(
    message,
  );
}

export function isGeminiToolConfigError(error: unknown): boolean {
  return /include_server_side_tool_invocations|Built-in tools with Function calling|tool combination/i.test(
    errorMessage(error),
  );
}

/**
 * Map Gemini / stream failures into operator-safe board copy.
 * Avoids the opaque "verify GOOGLE_API_KEY" catch-all when the real cause is quota, model, or network.
 */
export function classifyGeminiStreamFault(error: unknown): GeminiStreamFault {
  const message = errorMessage(error);
  const logDetail = message.slice(0, 480) || "unknown error";

  if (!message && error == null) {
    return {
      kind: "unknown",
      operatorMessage: "Live stream faulted with no detail. Retry in a moment.",
      logDetail: "empty error",
    };
  }

  if (/abort|AbortError/i.test(message)) {
    return {
      kind: "abort",
      operatorMessage: "Live stream stopped (client disconnected). Send again to continue.",
      logDetail,
    };
  }

  if (isGeminiAuthError(error)) {
    return {
      kind: "auth",
      operatorMessage:
        "Gemini rejected the API key. Set a valid GOOGLE_API_KEY on the Ironboard worker (Cloud Run / Ironboard/.env), then redeploy or restart.",
      logDetail,
    };
  }

  if (isGeminiRateLimitError(error)) {
    return {
      kind: "quota",
      operatorMessage:
        "Gemini rate limit / quota hit. Wait briefly and retry; if this persists, upgrade Google AI billing or reduce concurrent board traffic.",
      logDetail,
    };
  }

  if (isGeminiModelError(error)) {
    return {
      kind: "model",
      operatorMessage:
        "Gemini model unavailable. Confirm IRONBOARD_GEMINI_MODEL (default gemini-3.5-flash) is enabled for this API key.",
      logDetail,
    };
  }

  if (isGeminiToolConfigError(error)) {
    return {
      kind: "tool_config",
      operatorMessage:
        "Gemini rejected the boardroom tool configuration (search + function calling). Ironboard needs includeServerSideToolInvocations enabled — redeploy the latest Ironboard worker.",
      logDetail,
    };
  }

  if (isGeminiNetworkError(error)) {
    return {
      kind: "network",
      operatorMessage:
        "Live stream could not reach Gemini (network). Retry — if it repeats, check Ironboard outbound egress to generativelanguage.googleapis.com.",
      logDetail,
    };
  }

  return {
    kind: "unknown",
    operatorMessage: `Live stream faulted: ${logDetail.slice(0, 220)}. Retry, or check Ironboard [IRONBOARD STREAM] logs.`,
    logDetail,
  };
}

/** Parse server-suggested retry delay from Gemini ApiError payloads. */
export function parseGeminiRetryDelayMs(error: unknown): number | null {
  const message = errorMessage(error);
  const retryIn = message.match(/retry in (\d+(?:\.\d+)?)s/i);
  if (retryIn) return Math.ceil(parseFloat(retryIn[1]!) * 1000);
  const retryDelay = message.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/i);
  if (retryDelay) return Math.ceil(parseFloat(retryDelay[1]!) * 1000);
  return null;
}

export async function withGeminiRateLimitRetry<T>(
  operation: () => Promise<T>,
  options: GeminiRetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 1_000;
  const maxDelayMs = options.maxDelayMs ?? 30_000;
  const label = options.label ?? "Gemini";

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isGeminiRateLimitError(error) || attempt >= maxAttempts) {
        throw error;
      }

      const serverHint = parseGeminiRetryDelayMs(error);
      const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const delayMs = serverHint ?? exponential;
      const jitter = Math.floor(Math.random() * 250);
      const waitMs = Math.min(maxDelayMs, delayMs + jitter);

      console.warn(
        `[GEMINI RETRY] ${label} rate-limited (attempt ${attempt}/${maxAttempts}); waiting ${waitMs}ms`,
      );
      await sleep(waitMs);
    }
  }

  throw lastError;
}
