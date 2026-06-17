"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  type IronframeThemeId,
  IRONFRAME_THEME_OPTIONS,
  applyIronframeThemeToDocument,
  ironframeThemeIdFromNext,
  nextThemeFromIronframeId,
} from "@/app/lib/ironframeTheme";

export function useIronframeTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const activeId: IronframeThemeId = ironframeThemeIdFromNext(theme);

  const setIronframeTheme = (id: IronframeThemeId) => {
    const next = nextThemeFromIronframeId(id);
    applyIronframeThemeToDocument(next);
    setTheme(next);
  };

  return {
    mounted,
    activeId,
    options: IRONFRAME_THEME_OPTIONS,
    resolvedTheme,
    systemTheme,
    setIronframeTheme,
  };
}
