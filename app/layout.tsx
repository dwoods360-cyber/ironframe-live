import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConditionalAppShell from "./components/ConditionalAppShell";
import IronguardBootstrap from "./components/IronguardBootstrap";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full font-sans" suppressHydrationWarning>
      {/* suppressHydrationWarning: Prevents crashes from browser extensions (Grammarly, etc.) injecting attributes into the DOM. */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full overflow-hidden antialiased font-sans select-text`}
        suppressHydrationWarning
      >
        <TenantProvider>
          <OperatorProvider>
          <GlobalEkgPortal />
          <NotificationOverlay />
          <GrcAgentMetaDrawer />
          <ConstitutionalIntegrityProvider>
            <AuditTrackingProvider>
            <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 select-text">
              <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <EmergencyOverlay />
                <ConstitutionalDegradedBanner />
                <StaleDataLockdownBanner />
                <IronguardBootstrap />
                <GlobalDropZone />
                <ConditionalAppShell>{children}</ConditionalAppShell>
                {/* SpeedInsights disabled: can trigger async Client Component error in Next 16/Turbopack */}
              </main>
            </div>
            </AuditTrackingProvider>
          </ConstitutionalIntegrityProvider>
          </OperatorProvider>
        </TenantProvider>
      </body>
    </html>
  );
}
