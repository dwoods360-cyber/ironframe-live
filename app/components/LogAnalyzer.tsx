"use client";

type Props = {
  logs: string[];
};

export default function LogAnalyzer({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="rounded border border-slate-800 bg-slate-900/40 p-3 text-[10px] text-slate-400">
        No forensic trace lines found for this test record.
      </div>
    );
  }

  return (
    <div className="max-h-56 overflow-y-auto rounded border border-slate-800 bg-slate-950/70 p-3 font-mono text-[10px] text-emerald-300">
      {logs.map((line, idx) => (
        <p key={`${idx}-${line.slice(0, 20)}`} className="whitespace-pre-wrap leading-relaxed">
          {line}
        </p>
      ))}
    </div>
  );
}
