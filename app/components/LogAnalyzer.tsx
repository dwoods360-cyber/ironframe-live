"use client";

type Props = {
  logs: string[];
};

export default function LogAnalyzer({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="rounded-md border border-zinc-800/90 bg-[#08080c]/90 p-3 text-[10px] text-zinc-500 ring-1 ring-white/[0.03]">
        No forensic trace lines found for this test record.
      </div>
    );
  }

  return (
    <div className="max-h-56 overflow-y-auto rounded-md border border-zinc-800/90 bg-[#050509]/95 p-3 font-mono text-[10px] text-emerald-300/95 ring-1 ring-white/[0.04]">
      {logs.map((line, idx) => (
        <p key={`${idx}-${line.slice(0, 20)}`} className="whitespace-pre-wrap leading-relaxed">
          {line}
        </p>
      ))}
    </div>
  );
}
