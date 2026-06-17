/** Ironframe UI theme identifiers — persisted via next-themes (`ironframe-ui-theme`). */
export type IronframeThemeId = "standard-system" | "executive-light" | "cyber-command-dark";

export const IRONFRAME_THEME_STORAGE_KEY = "ironframe-ui-theme";

/** Primary theme token on `document.body` (CSS + layout hooks). */
export const IRONFRAME_THEME_BODY_ATTR = "data-ironframe-theme";

/** Static palette marker on `document.body` — UI-only; never mixed with tenant data context. */
export const IRONFRAME_THEME_PALETTE_ATTR = "data-ironframe-palette";

/** Values passed to next-themes (`system` enables OS light/dark sync). */
export type IronframeNextThemeValue = "system" | "executive-light" | "cyber-command-dark";

export const IRONFRAME_THEME_OPTIONS: ReadonlyArray<{
  id: IronframeThemeId;
  nextTheme: IronframeNextThemeValue;
  label: string;
  description: string;
}> = [
  {
    id: "standard-system",
    nextTheme: "system",
    label: "Standard System",
    description: "Follows your device light or dark appearance.",
  },
  {
    id: "executive-light",
    nextTheme: "executive-light",
    label: "Executive Light",
    description: "Clean white background with Google-style gray tones.",
  },
  {
    id: "cyber-command-dark",
    nextTheme: "cyber-command-dark",
    label: "Cyber Command Dark",
    description: "Midnight command deck with neon status accents.",
  },
];

export function ironframeThemeIdFromNext(value: string | undefined): IronframeThemeId {
  if (value === "executive-light") return "executive-light";
  if (value === "cyber-command-dark") return "cyber-command-dark";
  return "standard-system";
}

export function nextThemeFromIronframeId(id: IronframeThemeId): IronframeNextThemeValue {
  return IRONFRAME_THEME_OPTIONS.find((o) => o.id === id)?.nextTheme ?? "system";
}

/** Static body attributes injected when a palette is selected from the profile menu. */
export function resolveBodyThemeAttributes(
  nextTheme: string | undefined,
): Readonly<Record<string, string>> {
  const id = ironframeThemeIdFromNext(nextTheme);
  if (id === "executive-light") {
    return {
      [IRONFRAME_THEME_BODY_ATTR]: "executive-light",
      [IRONFRAME_THEME_PALETTE_ATTR]: "executive-light",
    };
  }
  if (id === "cyber-command-dark") {
    return {
      [IRONFRAME_THEME_BODY_ATTR]: "cyber-command-dark",
      [IRONFRAME_THEME_PALETTE_ATTR]: "cyber-command-dark",
    };
  }
  return {
    [IRONFRAME_THEME_BODY_ATTR]: "system",
    [IRONFRAME_THEME_PALETTE_ATTR]: "standard-system",
  };
}

/** Mirror active palette onto `document.body` for layout-level CSS (TAS UI-only scope). */
export function applyIronframeThemeToDocument(nextTheme: string | undefined): void {
  if (typeof document === "undefined") return;

  const attrs = resolveBodyThemeAttributes(nextTheme);
  const { body } = document;

  body.removeAttribute(IRONFRAME_THEME_BODY_ATTR);
  body.removeAttribute(IRONFRAME_THEME_PALETTE_ATTR);

  for (const [key, value] of Object.entries(attrs)) {
    body.setAttribute(key, value);
  }
}

export function clearIronframeThemeFromDocument(): void {
  if (typeof document === "undefined") return;
  document.body.removeAttribute(IRONFRAME_THEME_BODY_ATTR);
  document.body.removeAttribute(IRONFRAME_THEME_PALETTE_ATTR);
}
