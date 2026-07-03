"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { useOperatorContext } from "@/app/context/OperatorContext";
import { useHostTenantSlug } from "@/app/hooks/useHostTenantSlug";
import {
  type IronframeThemeId,
  IRONFRAME_SAAS_THEME,
  IRONFRAME_THEME_OPTIONS,
  applyIronframeThemeToDocument,
  ironframeThemeIdFromNext,
  nextThemeFromIronframeId,
} from "@/app/lib/ironframeTheme";
import { isIronframeSaaSAppPath } from "@/app/utils/grcRouteMatch";

export function useIronframeTheme() {
  const pathname = usePathname() ?? "/";
  const { user, isInitializing } = useOperatorContext();
  const hostTenantSlug = useHostTenantSlug();
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const saasLocked = isIronframeSaaSAppPath(pathname, {
    authenticated: !isInitializing && user != null,
    hostTenantSlug,
  });

  useEffect(() => setMounted(true), []);

  const activeId: IronframeThemeId = saasLocked
    ? "cyber-command-dark"
    : ironframeThemeIdFromNext(theme);

  const setIronframeTheme = (id: IronframeThemeId) => {
    if (saasLocked) return;
    const next = nextThemeFromIronframeId(id);
    applyIronframeThemeToDocument(next);
    setTheme(next);
  };

  return {
    mounted,
    activeId,
    options: IRONFRAME_THEME_OPTIONS,
    resolvedTheme: saasLocked ? IRONFRAME_SAAS_THEME : resolvedTheme,
    systemTheme,
    saasLocked,
    setIronframeTheme,
  };
}
