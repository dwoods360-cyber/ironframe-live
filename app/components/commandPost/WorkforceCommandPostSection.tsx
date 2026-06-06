"use client";

import { useEffect } from "react";
import CommandPostGrid from "@/app/components/commandPost/CommandPostGrid";
import CommandPostFreezeControl from "@/app/components/commandPost/CommandPostFreezeControl";

function scrollToAgentHash() {
  const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
  if (!hash.startsWith("agent-")) return;
  const el = document.getElementById(hash);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/**
 * 19-agent Command Post (dense 12-column grid). Operational Support bottom section; anchor `#workforce`.
 * Ironwatch pulse: `AppShell` → `useIronwatchTelemetryFeed`. Freeze: persisted `useLayoutStore`.
 */
export default function WorkforceCommandPostSection() {
  useEffect(() => {
    scrollToAgentHash();
    window.addEventListener("hashchange", scrollToAgentHash);
    return () => window.removeEventListener("hashchange", scrollToAgentHash);
  }, []);
  return (
    <section
      id="workforce"
      aria-labelledby="workforce-heading"
      className="scroll-mt-[9.5rem] border-t border-zinc-800/90 bg-[#050509] px-3 py-8 sm:px-5"
    >
      <hr className="mb-6 border-zinc-700/80" aria-hidden />
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h2
            id="workforce-heading"
            className="font-mono text-sm font-black uppercase tracking-[0.18em] text-cyan-300/95"
          >
            Workforce Command Post
          </h2>
          <p className="max-w-3xl font-mono text-[10px] leading-relaxed text-zinc-500">
            19-agent telemetry · grid-flow-dense layout · Ironwatch pulse · click amber/red tiles to acknowledge
          </p>
        </div>
        <CommandPostFreezeControl variant="section" />
      </header>
      <div className="w-full max-w-full overflow-x-hidden">
        <CommandPostGrid variant="embedded" />
      </div>
    </section>
  );
}
