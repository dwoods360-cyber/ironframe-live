"use client";

import Link from "next/link";
import { useState } from "react";

import {
  CUSTOMER_FACING_PATH_B_SKU,
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  formatPathBUsd,
  formatPlannedGaCommandUsd,
} from "@/lib/ironframeProductKnowledge/commercial";

import WorkflowReviewPostYesStrip from "./WorkflowReviewPostYesStrip";

/**
 * GTM Host LIVE script: Command Design Partner.
 * Spoken copy first; SoD + banned words + internal context kept operator-facing only.
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
            GTM host · LIVE call script
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">{sku}</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">
            You host this {days === 90 ? "15-minute" : "short"} workflow review. Read the quoted
            lines to the prospect. Keep the notices below for yourself — not for the call.
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
          <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 p-3 text-xs leading-relaxed">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-300">
              Operator procedural notice (SoD)
            </p>
            <p className="mt-2 text-slate-200">
              <strong className="text-white">Your role (GTM host):</strong> run this workflow
              review, capture 2–3 written success criteria, and complete the order form.
            </p>
            <p className="mt-1.5 text-slate-300">
              <strong className="text-white">Admin duty (separate):</strong> tenant provisioning and
              billing activation happen after handoff by a platform admin. Do not try to provision
              during the call.
            </p>
          </div>

          <div className="rounded-lg border border-rose-900/50 bg-rose-950/25 p-3 text-xs leading-relaxed">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-rose-300">
              Banned on live calls
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-rose-50/90">
              <li>
                Never cite demo baselines as real customers: Medshield, Vaultbank, Gridcore
                (synthetic demo seeds only).
              </li>
              <li>
                Never use internal system code out loud: Path B, Command Tier, Ironguard, Irongate,
                RLS, BigInt.
              </li>
              <li>
                Never offer discounts, free PoCs, or trials. The {price} fee is non-refundable and
                fixed.
              </li>
            </ul>
            <p className="mt-2 text-slate-300">
              <strong className="text-white">Say out loud:</strong> {sku} only.
            </p>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
              15-minute agenda & spoken copy
            </h3>

            <div className="mt-3 space-y-3">
              <article className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/90">
                  00:00–03:00 · Ingress — identify the friction
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Goal: skip the generic pitch. Find where multi-client or board-level reporting is
                  breaking down.
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-cyan-300/80">
                  What to say
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white">
                  “Thanks for making time. We can skip the standard pitch deck today — I want to
                  focus purely on your workflow. As you manage multi-client governance and report up
                  to leadership or boards, where does evidence collection, multi-entity data bleed,
                  or spreadsheet friction hurt your team the most right now?”
                </p>
              </article>

              <article className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/90">
                  03:00–08:00 · Structure — control-first architecture
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Goal: contrast deterministic money math and isolated environments against
                  qualitative “heatmap theater.”
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-cyan-300/80">
                  What to say
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white">
                  “The reason we built Ironframe is that traditional GRC platforms rely on 5×5
                  heatmaps and color charts that boards can’t actually make decisions on. We take a
                  control-first approach: every client lives in its own strictly isolated
                  environment, every piece of evidence passes through a zero-trust gateway before
                  it’s saved, and financial risk is calculated in real dollars and cents — not
                  arbitrary high/medium/low scores.”
                </p>
              </article>

              <article className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/90">
                  08:00–12:00 · The offer — {sku}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Goal: anchor the {price} non-refundable price, {days}-day window, and credit toward
                  annual Command.
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-cyan-300/80">
                  What to say
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white">
                  “Rather than asking you to sign an annual enterprise contract up front, we bring
                  on a small cohort through our {sku} program. It’s a fixed {days}-day co-builder
                  engagement for {price}. You write 2–3 concrete success criteria with us. We
                  deliver on those criteria over {days} days. If you choose to convert to an annual
                  license at the end, that full {price} is applied as a direct credit toward your
                  Year 1 subscription (list ~{commandList}/yr). If you don’t convert, the program
                  simply concludes — no automatic renewals or surprise bills.”
                </p>
              </article>

              <article className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/90">
                  12:00–15:00 · The gate — order form & next step
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Goal: lock in their criteria and set up the admin handoff.
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-cyan-300/80">
                  What to say
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white">
                  “If this matches what you need, the next step isn’t a product demo — it’s
                  capturing your 2–3 success criteria on a short order form. Once you approve those
                  criteria, we hand off to our administrative team to issue your dedicated tenant
                  activation link. Does it make sense to outline those 2–3 criteria today?”
                </p>
              </article>
            </div>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
              Pocket Q&A · objection handling
            </h3>
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-800">
              <table className="min-w-full border-collapse text-left text-[11px] leading-relaxed">
                <thead className="bg-slate-950/80 text-[10px] uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="border-b border-slate-800 px-3 py-2 font-medium">
                      Prospect question
                    </th>
                    <th className="border-b border-slate-800 px-3 py-2 font-medium">
                      Spoken answer
                    </th>
                    <th className="border-b border-slate-800 px-3 py-2 font-medium">
                      Internal (do not spook)
                    </th>
                  </tr>
                </thead>
                <tbody className="align-top text-slate-300">
                  <tr className="border-b border-slate-800/80">
                    <td className="px-3 py-2.5 font-medium text-white">
                      Are you SOC 2 certified?
                    </td>
                    <td className="px-3 py-2.5 text-slate-100">
                      “Our architecture is built directly to SOC 2 and ISO standards, though we
                      don’t hold a completed Type II audit badge yet. We’re happy to walk you
                      through our tenant isolation and gateway architecture during diligence.”
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      Architecture aligned; do not claim a finished Type II logo.
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/80">
                    <td className="px-3 py-2.5 font-medium text-white">
                      Can we do a free trial or PoC?
                    </td>
                    <td className="px-3 py-2.5 text-slate-100">
                      “We don’t offer free trials because every partner gets direct engineering
                      attention. The {days}-day {price} program is designed so you test us against
                      2–3 explicit criteria before committing to an annual license.”
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      Paid co-builder only ({price} fixed).
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/80">
                    <td className="px-3 py-2.5 font-medium text-white">
                      Can we negotiate the price or conversion discount?
                    </td>
                    <td className="px-3 py-2.5 text-slate-100">
                      “The pricing is fixed across all design partners. The {price} fee applies 100%
                      as a credit toward your Year 1 annual subscription if you convert in-window.”
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      Non-negotiable %. No custom discounting.
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/80">
                    <td className="px-3 py-2.5 font-medium text-white">
                      How is this different from Vanta or Drata?
                    </td>
                    <td className="px-3 py-2.5 text-slate-100">
                      “Vanta and Drata are great for automated SOC 2 compliance checklists.
                      Ironframe solves a different problem: multi-client tenant isolation and
                      quantifying financial loss exposure for board reporting.”
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      Complementary buying job; don’t attack checklist tools.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-medium text-white">
                      Can I see a full product demo first?
                    </td>
                    <td className="px-3 py-2.5 text-slate-100">
                      “This call is specifically for workflow diligence and setting success
                      criteria. Once we agree on your 2–3 metrics, we review the exact environment
                      workflow built for those criteria.”
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      Gate full product walk behind mutual criteria lock.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <WorkflowReviewPostYesStrip />

          <p className="text-[10px] text-slate-500">
            More doctrine:{" "}
            <Link href="/dashboard/operations/library" className="text-cyan-300 hover:underline">
              Operator library
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}
