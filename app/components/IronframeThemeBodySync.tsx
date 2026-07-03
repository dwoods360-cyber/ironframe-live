"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect } from "react";

import { useOperatorContext } from "@/app/context/OperatorContext";
import { useHostTenantSlug } from "@/app/hooks/useHostTenantSlug";
import {
  IRONFRAME_SAAS_THEME,
  applyIronframeThemeToDocument,
} from "@/app/lib/ironframeTheme";
import { isIronframeSaaSAppPath } from "@/app/utils/grcRouteMatch";

/**
 * Keeps `document.body` theme data attributes in sync with next-themes.
 * Tenant workspace routes lock to Cyber Command Dark regardless of stored preference.
 */
export default function IronframeThemeBodySync() {
  const pathname = usePathname() ?? "/";
  const { user, isInitializing } = useOperatorContext();
  const hostTenantSlug = useHostTenantSlug();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const saasLocked = isIronframeSaaSAppPath(pathname, {
    authenticated: !isInitializing && user != null,
    hostTenantSlug,
  });

  useEffect(() => {
    if (!saasLocked) return;
    if (theme !== IRONFRAME_SAAS_THEME) {
      setTheme(IRONFRAME_SAAS_THEME);
    }
  }, [saasLocked, setTheme, theme]);

  useEffect(() => {
    const effectiveTheme = saasLocked ? IRONFRAME_SAAS_THEME : (theme ?? resolvedTheme);
    applyIronframeThemeToDocument(effectiveTheme);
  }, [resolvedTheme, saasLocked, theme]);

  return null;
}
