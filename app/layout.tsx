import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import AppShellRouter from "./components/AppShellRouter";
import IronframeThemeBodySync from "./components/IronframeThemeBodySync";
import IronguardBootstrap from "./components/IronguardBootstrap";
import { HostTenantSlugProvider } from "./context/HostTenantSlugContext";
import { TenantProvider } from "./context/TenantProvider";
import { OperatorProvider } from "./context/OperatorContext";
import { ConstitutionalIntegrityProvider } from "./context/ConstitutionalIntegrityProvider";
import GlobalDropZone from "./components/GlobalDropZone";
import EmergencyOverlay from "./components/EmergencyOverlay";
import ConstitutionalDegradedBanner from "./components/ConstitutionalDegradedBanner";
import StaleDataLockdownBanner from "./components/StaleDataLockdownBanner";
import GlobalEkgPortal from "./components/GlobalEkgPortal";
import NotificationOverlay from "./components/NotificationOverlay";
import GrcAgentMetaDrawer from "./components/GrcAgentMetaDrawer";
import AuditTrackingProvider from "./providers/AuditTrackingProvider";
import IronframeThemeProvider from "./providers/IronframeThemeProvider";
import { IRONFRAME_SAAS_THEME } from "@/app/lib/ironframeTheme";
import { IRONFRAME_HOST_TENANT_SLUG_HEADER, tenantSlugFromHost } from "@/app/lib/tenantSubdomain";
import { isIronframeSaaSAppPath } from "@/app/utils/grcRouteMatch";
import { getHostBoundTenantUuid } from "@/app/utils/serverTenantContext";
import { IRONFRAME_PATHNAME_HEADER } from "@/lib/supabase/middleware";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ironframe — Control-First GRC",
  description: "Autonomous governance telemetry and cyber insurance optimization platform.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const initialHostTenantSlug =
    requestHeaders.get(IRONFRAME_HOST_TENANT_SLUG_HEADER)?.trim() ||
    tenantSlugFromHost(requestHeaders.get("host")) ||
    null;
  const initialHostTenantUuid = await getHostBoundTenantUuid();
  const pathname = requestHeaders.get(IRONFRAME_PATHNAME_HEADER)?.trim() || "/";
  const saasThemeLocked = isIronframeSaaSAppPath(pathname, { hostTenantSlug: initialHostTenantSlug });

  return (
    <html
      lang="en"
      className="h-full font-sans"
      data-ironframe-theme={saasThemeLocked ? IRONFRAME_SAAS_THEME : undefined}
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} ironframe-layout-body h-full overflow-hidden antialiased font-sans select-text`}
        suppressHydrationWarning
      >
        <IronframeThemeProvider>
          <HostTenantSlugProvider
            initialHostTenantSlug={initialHostTenantSlug}
            initialHostTenantUuid={initialHostTenantUuid}
          >
            <TenantProvider>
              <OperatorProvider>
                <IronframeThemeBodySync />
                <ConstitutionalIntegrityProvider>
                  <AuditTrackingProvider>
                    <GlobalEkgPortal />
                    <NotificationOverlay />
                    <GrcAgentMetaDrawer />
                    <EmergencyOverlay />
                    <ConstitutionalDegradedBanner />
                    <StaleDataLockdownBanner />
                    <IronguardBootstrap />
                    <GlobalDropZone />
                    <main className="ironframe-app-shell flex h-full min-h-0 w-full flex-col overflow-hidden">
                      <AppShellRouter>{children}</AppShellRouter>
                    </main>
                  </AuditTrackingProvider>
                </ConstitutionalIntegrityProvider>
              </OperatorProvider>
            </TenantProvider>
          </HostTenantSlugProvider>
        </IronframeThemeProvider>
      </body>
    </html>
  );
}
