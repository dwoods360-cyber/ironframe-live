"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";

type PlaybookChecklistProps = {
  steps: string[];
};

export default function PlaybookChecklist({ steps }: PlaybookChecklistProps) {
  const [completed, setCompleted] = useState<boolean[]>(() => steps.map(() => false));
  const [activeStep, setActiveStep] = useState(0);

  const toggleStep = (index: number) => {
    setCompleted((current) => current.map((value, i) => (i === index ? !value : value)));
    setActiveStep(index);
  };

  return (
    <div>
      {steps.map((step, index) => {
        const isComplete = completed[index];
        const isActive = activeStep === index && !isComplete;

        return (
          <label
            key={step}
            className={`mb-2 flex cursor-pointer items-center gap-3 rounded border p-4 ${
              isActive ? "border-blue-500" : "border-slate-800"
            } bg-slate-900/40`}
          >
            <input
              type="checkbox"
              checked={isComplete}
              onChange={() => toggleStep(index)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950 accent-emerald-500"
            />

            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span
                className={`text-[11px] font-semibold ${
                  isComplete ? "text-slate-400 line-through" : "text-white"
                }`}
              >
                {step}
              </span>

              {isComplete ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : isActive ? (
                <Circle className="h-4 w-4 shrink-0 animate-pulse text-blue-400" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-slate-600" />
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
