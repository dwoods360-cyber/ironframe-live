"use client";

type ControlToolPrintButtonProps = {
  className?: string;
};

/**
 * Opens the browser print dialog — Save as PDF is the offline download path.
 * LinkedIn and other channels should link to /tools/[slug], not host files.
 */
export default function ControlToolPrintButton({ className }: ControlToolPrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ??
        "inline-flex h-11 touch-manipulation items-center justify-center rounded-md border border-teal-700 bg-teal-950/40 px-5 text-sm font-semibold text-teal-100 transition-colors hover:border-teal-500 hover:bg-teal-900/50"
      }
    >
      Print / Save PDF
    </button>
  );
}
