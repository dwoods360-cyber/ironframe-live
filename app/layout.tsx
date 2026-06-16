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

import IronframeThemeProvider from "./providers/IronframeThemeProvider";



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

        className={`${geistSans.variable} ${geistMono.variable} ironframe-layout-body h-full overflow-hidden antialiased font-sans select-text`}

        suppressHydrationWarning

      >

        <IronframeThemeProvider>

          <TenantProvider>

            <OperatorProvider>

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

                    <ConditionalAppShell>{children}</ConditionalAppShell>

                  </main>

                </AuditTrackingProvider>

              </ConstitutionalIntegrityProvider>

            </OperatorProvider>

          </TenantProvider>

        </IronframeThemeProvider>

      </body>

    </html>

  );

}


