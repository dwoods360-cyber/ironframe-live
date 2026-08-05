"use client";

import Link from "next/link";

import FounderPitchPracticeAudio from "../workflow-review/FounderPitchPracticeAudio";
import { FOUNDER_PITCH_CASUAL } from "../workflow-review/founderPitchPracticeAssets";

export default function FounderPitchCasualClient() {
  return (
    <div className="min-h-screen bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="space-y-2 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap gap-3 text-xs">
            <Link href="/dashboard/operations" className="text-cyan-300 hover:underline">
              ← Operations hub
            </Link>
            <Link
              href="/dashboard/operations/workflow-review"
              className="text-amber-300 hover:underline"
            >
              Commercial register (LIVE desk)
            </Link>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
            Founder practice · casual / peer register
          </p>
          <h1 className="text-2xl font-bold text-white">Coffee-chat pitch desk</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            Same four ideas as the commercial kit — dollars, isolation, no heatmap theater, soft
            ask — without catalog pressure. Switch pages when the room wants sharper language.
          </p>
        </header>

        <FounderPitchPracticeAudio register="casual" variant="card" />

        <section className="space-y-3 rounded-xl border border-emerald-900/40 bg-emerald-950/15 p-4 text-sm text-slate-300">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-300">
            Quick pocket lines
          </p>
          <ul className="list-disc space-y-2 pl-5 text-xs leading-relaxed">
            <li>
              <strong className="text-white">Hallway:</strong> “We help regulated companies and
              MSSPs see cyber risk in real dollars, with each client in its own locked workspace —
              so you’re not stuck with heatmaps or mixed client data.”
            </li>
            <li>
              <strong className="text-white">Vanta:</strong> “Great when you need a badge fast. We’re
              for when the board asks what you’re actually exposed for — and you can’t mix client
              evidence.”
            </li>
            <li>
              <strong className="text-white">AI:</strong> “Not a chatbot guessing liability. Governed
              agents pull work forward; humans still sign off.”
            </li>
            <li>
              <strong className="text-white">Ask:</strong> Soft first — short workflow review on one
              real pain. Price ($4,999 Design Partner) only after they lean in.
            </li>
          </ul>
          <p className="text-xs text-slate-500">
            Full printable:{" "}
            <a
              href={FOUNDER_PITCH_CASUAL.scriptPrint}
              className="text-cyan-300 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              open script
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
