import Link from "next/link";
import { redirect } from "next/navigation";

import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ops GTM · Path B talk track | Ironframe Operations",
  description:
    "Peer-to-peer workflow review talk track — Ops GTM / Path B. Not Governance Frame research.",
};

export default async function WorkflowReviewProtocolPage() {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3 border-b border-slate-800 pb-5">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-indigo-400">
            <span>Ops Hub</span>
            <span className="text-slate-600">·</span>
            <span>Command Post</span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400">Gatekeeper / Path B</span>
          </div>
          <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-amber-200">
            Plane: Ops GTM (sales diligence) — not Governance Frame research · not GFP curriculum
          </p>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-400">
            Ops GTM · Path B talk track
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Peer-to-Peer Technical Diligence Protocol
          </h1>
          <p className="max-w-2xl text-sm text-slate-400">
            Authoritative 10–15 minute workflow review. Collaborative, direct, slightly clinical —
            diagnose architectural pain. Not a demo. Not a free pilot. Not an agent-led sales call.
          </p>
          <div className="rounded-xl border border-slate-800 bg-[#070e20]/60 p-4 text-sm text-slate-300">
            <div>
              <strong className="text-white">Host on the wire:</strong> Human operator
            </div>
            <div>
              <strong className="text-white">Prep / Q&amp;A sidecar:</strong>{" "}
              <code className="rounded border border-slate-700 bg-slate-950 px-1 text-cyan-300">
                board-sales-lead
              </code>
            </div>
            <div>
              <strong className="text-white">Draft tone only:</strong> SalesTeam (HITL DISPATCH)
            </div>
            <div>
              <strong className="text-white">Commercial lock:</strong> Path B $4,999 · 90-day · 2–3
              written metrics
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1 text-xs font-semibold">
            <Link
              href="/dashboard/operations/workflow-review"
              className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-2 text-amber-100 hover:border-amber-500"
            >
              LIVE assist
            </Link>
            <Link
              href="/dashboard/admin/approvals?kind=SALES"
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-slate-200 hover:border-amber-700/50"
            >
              Sales Approvals
            </Link>
            <Link
              href="/dashboard/operations/salesteam"
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-slate-200 hover:border-amber-700/50"
            >
              SalesTeam portal
            </Link>
            <Link
              href="/dashboard/operations/library"
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-slate-200 hover:border-amber-700/50"
            >
              Operator library
            </Link>
            <Link
              href="/dashboard/operations"
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-slate-200 hover:border-amber-700/50"
            >
              Ops Hub
            </Link>
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-cyan-400">
            Doctrine
          </h2>
          <p className="text-sm text-slate-300">
            CISOs and infra leads tune out polished multi-stage sales scripts. This call is
            peer-to-peer technical diligence: you are a senior systems architect diagnosing a
            complex system, not selling a dream.
          </p>
          <p className="text-sm text-slate-300">
            <strong className="text-white">StoryBrand (stripped):</strong> Prospect = hero.
            Ironframe = engineering guide. Plan = Path B window + written criteria + capped syncs.
            Climax = defendable cents math + tenant walls + auditor-ready exports — not a marketing
            arc on the call.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-cyan-400">
            15-minute micro-agenda
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[40rem] border-collapse text-left text-xs text-slate-300">
              <thead className="bg-slate-950 font-mono text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Phase</th>
                  <th className="px-3 py-2">Objective</th>
                  <th className="px-3 py-2">Conversational pivot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-[#070e20]/40">
                <tr>
                  <td className="px-3 py-2 align-top">0:00–3:00</td>
                  <td className="px-3 py-2 align-top font-semibold text-white">Ingress diagnosis</td>
                  <td className="px-3 py-2 align-top">They name the pain</td>
                  <td className="px-3 py-2 align-top">
                    “Skip the high-level pitch — where does evidence collection debt, board-dollar
                    opacity, or multi-entity bleed show up in your stack today?”
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 align-top">3:00–8:00</td>
                  <td className="px-3 py-2 align-top font-semibold text-white">Structural mapping</td>
                  <td className="px-3 py-2 align-top">Map pain → patterns</td>
                  <td className="px-3 py-2 align-top">
                    “Here’s how we handle that structurally: containment at the database / tenant
                    boundary (PostgreSQL RLS + Ironguard), Irongate before persist, ALE in integer
                    cents — not color charts.”
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 align-top">8:00–12:00</td>
                  <td className="px-3 py-2 align-top font-semibold text-white">Path B invariant</td>
                  <td className="px-3 py-2 align-top">Hard commercial frame</td>
                  <td className="px-3 py-2 align-top">
                    “We don’t run endless discovery. Fixed <strong>90-day</strong> paid co-builder
                    seat at <strong>$4,999</strong>. We prove{" "}
                    <strong>2–3 written success metrics</strong> or we part ways.”
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 align-top">12:00–15:00</td>
                  <td className="px-3 py-2 align-top font-semibold text-white">Engineering gate</td>
                  <td className="px-3 py-2 align-top">Lock next step</td>
                  <td className="px-3 py-2 align-top">
                    “If this fits: order form with your 2–3 criteria → provision with your operator
                    email → tenant-scoped Path B activation link. Not a pitch deck. Not generic{" "}
                    <code className="rounded border border-slate-700 bg-slate-950 px-1 text-cyan-300">
                      /pricing
                    </code>
                    .”
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="rounded-lg border-l-4 border-amber-500 bg-amber-950/20 px-3 py-2 text-sm text-slate-300">
            Use booking context / Scout trigger / role. Do <strong className="text-white">not</strong>{" "}
            invent “architecture notes from the form” unless they actually submitted them.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-cyan-400">
            Structural mapping — allowed patterns
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
            <li>Multi-entity / affiliate walls → RLS + tenant isolation</li>
            <li>MSSP client enclaves → hard per-client boundaries</li>
            <li>Board pack → BigInt ALE in whole cents</li>
            <li>External intel → Irongate sanitize-before-persist</li>
            <li>Auditor path → tenant-scoped exports</li>
          </ul>
          <p className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-sm font-semibold text-red-300">
            Banned: citing medshield / vaultbank / gridcore as customers or “hardened baselines”
            (synthetic demo seeds only).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-cyan-400">
            Quick-fire Q&amp;A
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[36rem] border-collapse text-left text-xs text-slate-300">
              <thead className="bg-slate-950 font-mono text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">They ask</th>
                  <th className="px-3 py-2">You say</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-[#070e20]/40">
                <tr>
                  <td className="px-3 py-2 align-top">“Are you SOC 2 certified?”</td>
                  <td className="px-3 py-2 align-top">
                    “We’re <strong className="text-white">SOC2-aligned</strong> in architecture and
                    controls; we are <strong className="text-white">not</strong> claiming a completed
                    SOC 2 Type II logo today. Diligence is migrations, RLS paths, gateway rules, and
                    your Path B criteria — not paperwork theater.”
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 align-top">“Can we do a free trial / 30-day PoC?”</td>
                  <td className="px-3 py-2 align-top">
                    “No free tier or loose trial. Entry is flat{" "}
                    <strong className="text-white">$4,999</strong> for a{" "}
                    <strong className="text-white">90-day</strong> scoped engagement. Convert or exit
                    on criteria you write.”
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 align-top">
                    “How do you handle risk financialization?”
                  </td>
                  <td className="px-3 py-2 align-top">
                    “No qualitative 5×5 heatmaps as the board truth. Reporting math is{" "}
                    <strong className="text-white">integer cents</strong> (BigInt). Narrative agents
                    don’t invent ALE.”
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 align-top">“We’re already on Vanta/Drata.”</td>
                  <td className="px-3 py-2 align-top">
                    “Keep them for checklist continuous control if that job is done. We quantify loss
                    exposure and isolate entities — different buying job.”
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 align-top">“Show me a demo.”</td>
                  <td className="px-3 py-2 align-top">
                    “This slot is workflow diligence. Product walk is after Path B interest /
                    criteria — not instead of them.”
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-cyan-400">
            Pre-call brief · After a yes · Sidecar
          </h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-300">
            <li>Prospect / trigger / beachhead sector</li>
            <li>Likely pain hypothesis (evidence, isolation, board $)</li>
            <li>Path B language lock ($4,999 · 90-day · workflow-review CTA)</li>
            <li>Bans for this account</li>
            <li>Suggested 2–3 success-criteria starters (they still name the final ones)</li>
          </ol>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-300">
            <li>Order form (2–3 criteria)</li>
            <li>
              Provision with <strong className="text-white">client-owned</strong> operator email
            </li>
            <li>
              Send <strong className="text-white">tenant-scoped Path B link</strong> only
            </li>
            <li>
              On ACTIVE →{" "}
              <code className="rounded border border-slate-700 bg-slate-950 px-1 text-cyan-300">
                /get-started
              </code>{" "}
              + partner packet → SuccessTeam owns the plan
            </li>
          </ol>
          <p className="text-sm text-slate-300">
            Host yourself. Keep LIVE assist open:{" "}
            <code className="rounded border border-slate-700 bg-slate-950 px-1 text-cyan-300">
              /dashboard/operations/workflow-review
            </code>
          </p>
          <p className="font-mono text-[11px] text-slate-500">
            Canonical markdown: docs/sales/design-partner-workflow-review-protocol.md · Plane: Ops
            GTM (not GF / not GFP)
          </p>
        </section>
      </div>
    </div>
  );
}
