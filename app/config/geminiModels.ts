/**
 * Default Gemini Flash model when env overrides are unset.
 * gemini-2.5-flash was retired — see https://ai.google.dev/gemini-api/docs/deprecations
 */
export const DEFAULT_GEMINI_FLASH_MODEL = "gemini-3.5-flash";

/** Resolve the first non-empty env candidate, else {@link DEFAULT_GEMINI_FLASH_MODEL}. */
export function resolveGeminiFlashModel(
  ...candidates: Array<string | undefined | null>
): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed;
  }
  return DEFAULT_GEMINI_FLASH_MODEL;
}
