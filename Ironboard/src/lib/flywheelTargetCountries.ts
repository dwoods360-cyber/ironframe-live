/** localStorage key for operator target-country campaigns (IronBoard port 8082). */
export const TARGET_COUNTRIES_STORAGE_KEY = 'ironboard_target_countries';

const DEFAULT_TARGET_COUNTRIES_TEXT = 'Germany, Australia, Ireland, Canada';

/** Parse comma-, pipe-, or semicolon-separated market labels into a trimmed string array. */
export function parseTargetCountriesInput(raw: string): string[] {
  return raw
    .split(/[,|;]+/)
    .map(part => part.trim())
    .filter(Boolean);
}

/** Board stream / workspace context payload — uppercase comma-joined markets. */
export function formatTargetCountriesPayload(countries: string[]): string {
  return countries
    .map(c => c.trim())
    .filter(Boolean)
    .map(c => c.toUpperCase())
    .join(',');
}

export function readDefaultTargetCountriesText(): string {
  return DEFAULT_TARGET_COUNTRIES_TEXT;
}

/** Resolve flywheel campaign regions from activeHub payload, else operator defaults. */
export function resolveFlywheelTargetRegions(activeHub: string): string[] {
  const parsed = parseTargetCountriesInput(String(activeHub ?? '').replace(/,/g, '|'));
  if (parsed.length > 0) return parsed;
  return parseTargetCountriesInput(readDefaultTargetCountriesText());
}
