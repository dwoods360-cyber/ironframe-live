"use client";

import { useCallback, useEffect, useState } from "react";
import { FileBadge2, Link2, Loader2 } from "lucide-react";
import { ironguardFetch } from "@/app/utils/apiClient";
import { createInvestorReportShareLink } from "@/app/actions/investorReportActions";

type StatusOk = {
  ok: true;
  ready: boolean;
  template?: string | null;
  generatedAt?: string | null;
  milestoneDays?: number | null;
  pdfSha256?: string | null;
  wormTargetGsUri?: string | null;
};

export default function InvestorSustainabilityReportBanner() {
  const [status, setStatus] = useState<StatusOk | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareErr, setShareErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ironguardFetch("/api/grc/investor-reports/status", { cache: "no-store" });
      const j = (await res.json()) as StatusOk;
      setStatus(j.ok ? j : null);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 120_000);
    return () => window.clearInterval(id);
  }, [load]);

  const onShare = async () => {
    setShareBusy(true);
    setShareErr(null);
    setShareUrl(null);
    const r = await createInvestorReportShareLink();
    setShareBusy(false);
    if (!r.ok) {
      setShareErr(r.error);
      return;
    }
    setShareUrl(r.url);
    try {
      await navigator.clipboard.writeText(r.url);
    } catch {
      /* copy optional */
    }
  };

  if (loading || !status?.ready) {
    return null;
  }

  return (
    <div className="mb-4 rounded border border-indigo-600/45 bg-indigo-950/30 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <FileBadge2 className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-wide text-indigo-200">
            Ironscribe · Sustainability Achievement Report
          </p>
          <p className="mt-0.5 text-[8px] text-slate-400">
            {status.template ?? "Sustainability_Achievement_Report_V1"}
            {status.generatedAt ? ` · ${new Date(status.generatedAt).toLocaleString()}` : ""}
            {status.milestoneDays != null ? ` · Milestone ${status.milestoneDays}d` : ""}
          </p>
          {status.pdfSha256 ? (
            <p className="mt-0.5 truncate font-mono text-[7px] text-slate-500" title={status.pdfSha256}>
              PDF SHA-256 {status.pdfSha256.slice(0, 20)}…
            </p>
          ) : null}
          {status.wormTargetGsUri ? (
            <p className="mt-0.5 truncate text-[7px] text-slate-600" title={status.wormTargetGsUri}>
              WORM target: {status.wormTargetGsUri}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={shareBusy}
          onClick={() => void onShare()}
          className="inline-flex shrink-0 items-center gap-1 rounded border border-indigo-500/60 bg-indigo-900/40 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-indigo-100 hover:border-indigo-400 disabled:opacity-50"
        >
          {shareBusy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Link2 className="h-3 w-3" aria-hidden />}
          Share with Board/Investors
        </button>
      </div>
      {shareErr ? <p className="mt-1 text-[8px] text-rose-400">{shareErr}</p> : null}
      {shareUrl ? (
        <p className="mt-1 break-all text-[8px] text-emerald-300/90">
          Time-bound link (72h) copied when allowed: {shareUrl}
        </p>
      ) : null}
    </div>
  );
}
