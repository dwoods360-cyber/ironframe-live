"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { IRONFRAME_SAAS_THEME, IRONFRAME_THEME_STORAGE_KEY } from "@/app/lib/ironframeTheme";

export default function IronframeThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-ironframe-theme"
      defaultTheme={IRONFRAME_SAAS_THEME}
      themes={["system", "executive-light", "cyber-command-dark"]}
      enableSystem
      storageKey={IRONFRAME_THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
