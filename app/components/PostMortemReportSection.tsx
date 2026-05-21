"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getIncidentReportPreviewAction,
  logPostMortemReportDownloadAction,
} from "@/app/actions/incidentReportActions";

type Props = {
  threatId: string;
  threatName: string;
};

export default function PostMortemReportSection({ threatId, threatName }: Props) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [signatureOk, setSignatureOk] = useState(false);
  const [contributeCommunity, setContributeCommunity] = useState(false);
  const [preview, setPreview] = useState<
    Awaited<ReturnType<typeof getIncidentReportPreviewAction>> | null
  >(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [downloadPending, startDownload] = useTransition();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const openModal = () => {
    setOpen(true);
    setSignatureOk(false);
    setContributeCommunity(false);
    setLoadErr(null);
    startTransition(async () => {
      const r = await getIncidentReportPreviewAction(threatId);
      setPreview(r);
      if (!r.ok) setLoadErr(r.error);
    });
  };

  const downloadPdf = () => {
    startDownload(async () => {
      const r = await logPostMortemReportDownloadAction(
        threatId,
        signatureOk,
        contributeCommunity,
      );
      if (!r.ok) {
        setLoadErr(r.error);
        return;
      }
      window.open(`/api/incident-report/${encodeURIComponent(threatId)}`, "_blank", "noopener,noreferrer");
      setOpen(false);
      router.refresh();
    });
  };

  const previewOk = preview && preview.ok === true;

  return (
    <>
      <div className="rounded border border-teal-700/50 bg-slate-950/80 p-2">
        <p className="text-[9px] font-bold uppercase tracking-wide text-teal-400/90">GRC post-mortem</p>
        <p className="mt-1 text-[10px] leading-snug text-slate-300">
          Control Effectiveness Attestation generated at expert lifecycle resolution (Gate 7).
        </p>
        <button
          type="button"
          onClick={openModal}
          className="mt-2 inline-flex rounded border border-teal-600/70 bg-teal-950/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-100 hover:border-teal-400 hover:bg-teal-900/40"
        >
          Download Forensic Post-Mortem
        </button>
      </div>

      {isMounted && open ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="post-mortem-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-600 bg-slate-950 p-4 shadow-xl">
            <h2 id="post-mortem-modal-title" className="text-sm font-bold text-white">
              Post-mortem review & sign
            </h2>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              Case: <span className="font-mono text-slate-200">{threatId.slice(0, 12)}…</span> · {threatName}
            </p>

            {pending ? (
              <p className="mt-4 text-[11px] text-slate-500">Loading summary…</p>
            ) : loadErr ? (
              <p className="mt-4 text-[11px] text-rose-400">{loadErr}</p>
            ) : previewOk ? (
              <div className="mt-4 space-y-2 rounded border border-slate-700 bg-slate-900/60 p-3 text-[10px] leading-relaxed text-slate-300">
                <p className="font-semibold text-slate-200">PDF summary</p>
                <ul className="list-inside list-disc space-y-1 text-slate-400">
                  <li>ReasoningLog rows: {preview.reasoningCount}</li>
                  <li>AuditLog gates: {preview.auditCount}</li>
                  <li>
                    Forensic calibration (drill handshake, ms):{" "}
                    {preview.forensicDriftMs != null ? preview.forensicDriftMs : "—"}
                  </li>
                </ul>
                <p className="text-slate-500">
                  Full narrative, timeline, and TAS seal appear in the downloaded PDF.
                </p>
              </div>
            ) : null}

            <label className="mt-4 flex cursor-pointer items-start gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={signatureOk}
                onChange={(e) => setSignatureOk(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-600"
              />
              <span>
                I attest as <strong className="text-slate-200">Product Owner (Dereck)</strong> — digital
                signature for GRC closure.
              </span>
            </label>

            <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={contributeCommunity}
                onChange={(e) => setContributeCommunity(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-600"
              />
              <span>
                Contribute anonymized lessons to <strong className="text-slate-200">Community Intelligence</strong>?
              </span>
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={downloadPending || !previewOk || !signatureOk}
                onClick={downloadPdf}
                className="rounded bg-teal-700 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {downloadPending ? "Finalizing…" : "Download PDF"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-slate-600 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
