export type GeminiRetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isGeminiRateLimitError(error: unknown): boolean {
  if (!error) return false;
  const status = (error as { status?: number }).status;
  if (status === 429) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /429|RESOURCE_EXHAUSTED|quota exceeded|rate.?limit/i.test(message);
}

/** Parse server-suggested retry delay from Gemini ApiError payloads. */
export function parseGeminiRetryDelayMs(error: unknown): number | null {
  const message = error instanceof Error ? error.message : String(error);
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
