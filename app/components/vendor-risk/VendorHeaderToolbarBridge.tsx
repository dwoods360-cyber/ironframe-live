"use client";



import { useEffect, useMemo, useState } from "react";

import { usePathname } from "next/navigation";



import VendorRegistrySummaryModal from "@/app/components/vendor-risk/VendorRegistrySummaryModal";

import { usePilotStubExportGate } from "@/app/hooks/usePilotStubExportGate";

import {

  buildVendorRegistrySummary,

  downloadVendorRegistryCsv,

  type VendorDownloadDetail,

} from "@/app/lib/vendorRegistryExport";

import { buildHeaderRouteMatrix } from "@/app/utils/grcRouteMatch";



/**

 * Listens for Header #2 vendor toolbar events on vendor routes and supply-chain graph.

 */

export default function VendorHeaderToolbarBridge() {

  const pathname = usePathname() ?? "/";

  const routes = useMemo(() => buildHeaderRouteMatrix(pathname), [pathname]);

  const { suppressed, blockedMessage } = usePilotStubExportGate();

  const [summaryOpen, setSummaryOpen] = useState(false);

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const summary = useMemo(() => buildVendorRegistrySummary(), [summaryOpen]);



  useEffect(() => {

    if (!routes.isVendorsRoute) return;



    const handleOpenSummary = () => setSummaryOpen(true);



    const handleDownload = (event: Event) => {

      const detail = (event as CustomEvent<VendorDownloadDetail>).detail;

      if (detail?.format === "csv" || detail?.format === "both" || detail?.format == null) {

        if (suppressed) {

          setExportNotice(blockedMessage);

          return;

        }

        setExportNotice(null);

        downloadVendorRegistryCsv();

      }

    };



    window.addEventListener("vendors:open-summary", handleOpenSummary);

    window.addEventListener("vendors:download", handleDownload as EventListener);



    return () => {

      window.removeEventListener("vendors:open-summary", handleOpenSummary);

      window.removeEventListener("vendors:download", handleDownload as EventListener);

    };

  }, [routes.isVendorsRoute, suppressed, blockedMessage]);



  if (!routes.isVendorsRoute) return null;



  return (

    <>

      {exportNotice ? (

        <div

          className="fixed bottom-4 right-4 z-[60] max-w-sm rounded-lg border border-amber-500/40 bg-amber-950/90 px-4 py-3 font-mono text-[11px] leading-relaxed text-amber-100 shadow-lg"

          role="alert"

        >

          {exportNotice}

        </div>

      ) : null}

      <VendorRegistrySummaryModal

        open={summaryOpen}

        onClose={() => setSummaryOpen(false)}

        summary={summary}

        pilotSeedData

      />

    </>

  );

}


