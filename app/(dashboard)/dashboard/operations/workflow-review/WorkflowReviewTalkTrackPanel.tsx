"use client";

import { useState } from "react";

import {
  CUSTOMER_FACING_PATH_B_SKU,
  formatDesignPartnerSkuWithInternalHint,
  formatPathBUsd,
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  formatPlannedGaCommandUsd,
} from "@/lib/ironframeProductKnowledge/commercial";

import WorkflowReviewPostYesStrip from "./WorkflowReviewPostYesStrip";

/**
 * Compact Design Partner talk track for the LIVE assist desk — doctrine beside the mic.
 * Spoken SKU: Command Design Partner · Internal code: Path B.
 */
export default function WorkflowReviewTalkTrackPanel() {
  const [open, setOpen] = useState(true);
  const sku = CUSTOMER_FACING_PATH_B_SKU;
  const price = formatPathBUsd();
  const days = DESIGN_PARTNER_DEFAULT_WINDOW_DAYS;
  const commandList = formatPlannedGaCommandUsd();

  return (
    <section
      id="talk-track"
      className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-400">
            Ops GTM · Design Partner talk track
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Peer-to-peer diligence script</h2>
          <p className="mt-1 text-xs text-slate-400">
            Plane: Ops GTM — not GF research. Host is human; this panel is the script.
          </p>
          <p className="mt-2 rounded-lg border border-cyan-900/40 bg-slate-950/70 px-2.5 py-2 text-[11px] leading-relaxed text-cyan-100/90">
            <strong className="text-cyan-200">Say to prospect:</strong> {sku}.{" "}
            <strong className="text-slate-300">Internal code:</strong> Path B (Stripe / provision).
          </p>
          <p className="mt-2 rounded-lg border border-slate-700/80 bg-slate-950/60 px-2.5 py-2 text-[11px] leading-relaxed text-slate-400">
            <strong className="text-slate-200">SoD:</strong> GTM host runs this call + order-form
            criteria. Tenant provision / Path B activation oversight stays{" "}
            <code className="text-cyan-300">BUSINESS_ADMIN</code> /{" "}
            <code className="text-cyan-300">GLOBAL_ADMIN</code> — separate duty (not a{" "}
            <code className="text-cyan-300">sales_admin</code> role).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-amber-800/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-amber-100 hover:bg-amber-950/40"
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </div>

      {!open ? null : (
        <div className="mt-4 space-y-4 text-sm text-slate-300">
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400">
            <div>
              <strong className="text-slate-200">Lock:</strong> {sku} {price} · {days}-day · 2–3
              written metrics · non-refundable
            </div>
            <div>
              <strong className="text-slate-200">Convert:</strong> {price} credited to year-1 Command
              (list ~{commandList}) if converting in-window — not a negotiated % · exit = no refund
            </div>
            <div>
              <strong className="text-slate-200">Sidecar:</strong>{" "}
              <code className="text-cyan-300">board-sales-lead</code> · Drafts: SalesTeam HITL only
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              {formatDesignPartnerSkuWithInternalHint()}
            </div>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
              15-minute agenda
            </h3>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed">
              <li>
                <strong className="text-white">0–3 · Ingress</strong> — “Skip the pitch — where does
                evidence debt, board-dollar opacity, or multi-entity bleed show up today?”
              </li>
              <li>
                <strong className="text-white">3–8 · Structure</strong> — RLS + Ironguard walls,
                Irongate before persist, ALE in integer cents — not color charts.
              </li>
              <li>
                <strong className="text-white">8–12 · {sku}</strong> — Fixed {days}-day paid
                co-builder at {price} (non-refundable). Prove 2–3 written metrics or part ways. If
                you convert in-window, that {price} is credited to year-1 Command at list — not a
                haggled %.
              </li>
              <li>
                <strong className="text-white">12–15 · Gate</strong> — Order form with their criteria
                → client-owned operator email → tenant-scoped activation link (Path B). Not a deck.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
              Pocket answers
            </h3>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed">
              <li>
                <strong className="text-white">SOC 2?</strong> SOC2-aligned architecture — not a
                completed Type II logo claim today. Diligence is migrations, RLS, gateway, criteria.
              </li>
              <li>
                <strong className="text-white">Free trial?</strong> No. Flat {price} / {days}-day{" "}
                {sku}, non-refundable. Convert or exit on criteria they write.
              </li>
              <li>
                <strong className="text-white">Discount / convert?</strong> Not a negotiated %. If
                they convert in-window, the {price} {sku} fee credits year-1 Command (~{commandList}{" "}
                list). Exit = fee stays paid.
              </li>
              <li>
                <strong className="text-white">Risk $?</strong> Integer cents (BigInt) — not 5×5
                heatmap board truth.
              </li>
              <li>
                <strong className="text-white">Vanta/Drata?</strong> Keep for checklist CC if that job
                is done. We quantify loss + isolate entities — different buying job.
              </li>
              <li>
                <strong className="text-white">Demo?</strong> This slot is workflow diligence. Product
                walk after {sku} interest / criteria.
              </li>
            </ul>
          </div>

          <WorkflowReviewPostYesStrip />

          <p className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs font-semibold text-red-300">
            Banned on call: medshield / vaultbank / gridcore as customers or “hardened baselines”
            (demo seeds only).
          </p>

          <p className="font-mono text-[10px] text-slate-500">
            Full doctrine: docs/sales/design-partner-workflow-review-protocol.md · Operator library
          </p>
        </div>
      )}
    </section>
  );
}
