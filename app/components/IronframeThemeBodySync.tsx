"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { applyIronframeThemeToDocument } from "@/app/lib/ironframeTheme";

/**
 * Keeps `document.body` theme data attributes in sync with next-themes.
 * Tenant/workspace identity remains on the command-line header — never here.
 */
export default function IronframeThemeBodySync() {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    applyIronframeThemeToDocument(theme ?? resolvedTheme);
  }, [theme, resolvedTheme]);

  return null;
}
