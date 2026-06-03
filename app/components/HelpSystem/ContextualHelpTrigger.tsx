"use client";

import { useState } from "react";
import Link from "next/link";

interface HelpProps {
  featureId: string;
  title: string;
  location: string;
  purpose: string;
  steps: string[];
}

export default function ContextualHelpTrigger({
  featureId,
  title,
  location,
  purpose,
  steps,
}: HelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="ml-2 rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-400 transition-all hover:border-teal-500 hover:bg-teal-900 hover:text-teal-400 active:scale-90"
        title="Click for feature documentation"
      >
        ❓ HELP
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm">
          <div className="flex-1" onClick={() => setIsOpen(false)} aria-hidden />
          <div className="flex w-96 flex-col justify-between border-l border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-mono font-bold uppercase tracking-wide text-teal-400">
                  💡 Interactive Feature Doc
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="font-mono text-xs text-slate-500 hover:text-white"
                >
                  ✕ CLOSE
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    Function Name
                  </label>
                  <p className="mt-0.5 text-sm font-bold text-white">{title}</p>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    On-Screen Location
                  </label>
                  <p className="mt-0.5 font-sans text-xs text-slate-300">{location}</p>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    What It Is Used For
                  </label>
                  <p className="mt-1 rounded border border-slate-800 bg-slate-950 p-2.5 font-sans text-xs leading-relaxed text-slate-300">
                    {purpose}
                  </p>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    How to Use It
                  </label>
                  <ol className="mt-1 list-inside list-decimal space-y-1.5 pl-1 text-xs text-slate-400">
                    {steps.map((step, idx) => (
                      <li key={idx} className="font-sans">
                        <span className="text-slate-300">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-800 pt-4">
              <Link
                href={`/docs/qa/complete-feature-glossary#${featureId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded border border-teal-500/30 bg-teal-950/40 px-4 py-2 text-center font-mono text-xs tracking-tight text-teal-400 transition-colors hover:bg-teal-900/50"
              >
                📖 OPEN DEEP-DIVE WEB DOCUMENT ➔
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
