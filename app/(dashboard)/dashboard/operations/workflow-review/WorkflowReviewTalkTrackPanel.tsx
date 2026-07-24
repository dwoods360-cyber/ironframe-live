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
 * New-operator talk track: speakable phrases first, internal jargon behind a glossary.
 */
export default function WorkflowReviewTalkTrackPanel() {
  const [open, setOpen] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
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
            Call script · {days} minutes
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">What to say on the call</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">
            You host. This panel is your cue card — read the quoted lines to the prospect. Keep
            technical product words light unless they ask.
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
          <div className="rounded-lg border border-cyan-900/40 bg-slate-950/70 p-3 text-xs leading-relaxed">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
              Naming (memorize this)
            </p>
            <p className="mt-1.5 text-slate-200">
              <strong className="text-white">Say out loud:</strong> {sku}.
            </p>
            <p className="mt-1 text-slate-400">
              <strong className="text-slate-300">Do not say on the call:</strong> “Path B” — that is
              only an internal billing/setup code.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs leading-relaxed text-slate-300">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Money lock (do not improvise)
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4">
              <li>
                {sku} is <strong className="text-white">{price}</strong> for{" "}
                <strong className="text-white">{days} days</strong>, with{" "}
                <strong className="text-white">2–3 written success goals</strong> they own.
              </li>
              <li>
                <strong className="text-white">Not refundable</strong> if they leave early.
              </li>
              <li>
                If they buy full Ironframe Command later{" "}
                <em>inside that window</em>, the {price} is{" "}
                <strong className="text-white">credited</strong> toward year-1 Command (list about{" "}
                {commandList}) — not a negotiated discount %.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
              Minute-by-minute
            </h3>
            <ol className="mt-2 space-y-3">
              <li className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/90">
                  0–3 · Open
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-white">
                  “Let’s skip the product pitch. Where does evidence collection, board reporting, or
                  keeping entities cleanly separated get painful today?”
                </p>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Goal: hear their pain in their words — not ours.
                </p>
              </li>
              <li className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/90">
                  3–8 · How we think about it
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-white">
                  “We separate customer environments hard, check risky writes before they land, and
                  keep dollar risk in exact cents — not a color heatmap.”
                </p>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Stay plain. Only go deeper on security terms if they ask.
                </p>
              </li>
              <li className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/90">
                  8–12 · Offer ({sku})
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-white">
                  “If the fit is real, the clean next step is {sku}: {price} for {days} days, you
                  write 2–3 success goals, non-refundable. If you convert to Command in that window,
                  the {price} credits year one — not a haggled percentage.”
                </p>
              </li>
              <li className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/90">
                  12–15 · Close the meeting
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-white">
                  “If you’re in, we fill a short order form with your success goals, you use an
                  email you control for the operator seat, and we send your activation link —
                  not a slide deck.”
                </p>
              </li>
            </ol>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
              If they ask…
            </h3>
            <ul className="mt-2 space-y-2.5">
              <li className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 text-xs leading-relaxed">
                <p className="font-semibold text-white">“Are you SOC 2 certified?”</p>
                <p className="mt-1 text-slate-200">
                  “We’re built SOC 2–aligned; we’re not claiming a finished Type II logo today.
                  Diligence is how we migrate, isolate tenants, and gate writes — plus the success
                  goals you write.”
                </p>
              </li>
              <li className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 text-xs leading-relaxed">
                <p className="font-semibold text-white">“Can we do a free trial / PoC?”</p>
                <p className="mt-1 text-slate-200">
                  “No free pilot. {sku} is {price} / {days} days, non-refundable. You write the
                  success goals; we prove them or we part ways cleanly.”
                </p>
              </li>
              <li className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 text-xs leading-relaxed">
                <p className="font-semibold text-white">“Can we get a discount?”</p>
                <p className="mt-1 text-slate-200">
                  “We don’t negotiate a percentage off. If you convert to Command inside the window,
                  the {price} you already paid credits year-1 Command (about {commandList} list). If
                  you exit, the fee stays paid.”
                </p>
              </li>
              <li className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 text-xs leading-relaxed">
                <p className="font-semibold text-white">“How do you show risk dollars?”</p>
                <p className="mt-1 text-slate-200">
                  “Exact cents — money math you can audit — not a 5×5 color heatmap for the board.”
                </p>
              </li>
              <li className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 text-xs leading-relaxed">
                <p className="font-semibold text-white">“We already use Vanta / Drata.”</p>
                <p className="mt-1 text-slate-200">
                  “Keep them if they cover checklist compliance. We’re a different job: quantify
                  loss and keep entities isolated.”
                </p>
              </li>
              <li className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 text-xs leading-relaxed">
                <p className="font-semibold text-white">“Can you demo the product now?”</p>
                <p className="mt-1 text-slate-200">
                  “This call is workflow diligence. A product walk comes after {sku} interest and
                  written success goals — not instead of them.”
                </p>
              </li>
            </ul>
          </div>

          <WorkflowReviewPostYesStrip />

          <p className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs leading-relaxed text-red-200">
            <strong className="text-red-100">Never say on a call:</strong> that Medshield, Vaultbank,
            or Gridcore are real customers, or call demo data “hardened baselines.” Those are
            internal demo seeds only.
          </p>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40">
            <button
              type="button"
              onClick={() => setGlossaryOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
            >
              <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                Optional · internal terms (not for the prospect)
              </span>
              <span className="text-[10px] text-slate-500">
                {glossaryOpen ? "Hide" : "Show"}
              </span>
            </button>
            {glossaryOpen ? (
              <dl className="space-y-2 border-t border-slate-800 px-3 py-3 text-[11px] leading-relaxed text-slate-400">
                <div>
                  <dt className="font-semibold text-slate-300">Path B</dt>
                  <dd>Internal code for {sku} (billing / setup). Do not say this name to them.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-300">Your job vs admin setup</dt>
                  <dd>
                    You run the call and help with the order form. Turning on their tenant after a
                    yes is an admin step (platform admin roles) — hand it off; don’t invent a
                    “sales_admin” role.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-300">RLS / Ironguard / Irongate / ALE</dt>
                  <dd>
                    Internal product shorthand for tenant walls, write checks, and loss math. Prefer
                    the plain phrases in the script unless they want depth.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-300">More detail</dt>
                  <dd>
                    <Link
                      href="/dashboard/operations/library"
                      className="text-cyan-300 hover:underline"
                    >
                      Operator library
                    </Link>{" "}
                    · workflow review protocol
                  </dd>
                </div>
              </dl>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
