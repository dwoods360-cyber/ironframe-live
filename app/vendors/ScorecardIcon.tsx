"use client";

import { VendorLetterGrade } from "@/utils/scoringEngine";

type ScorecardIconProps = {
  grade: VendorLetterGrade;
  className: string;
};

export default function ScorecardIcon({ grade, className }: ScorecardIconProps) {
  return (
    <div
      className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-black ${className}`}
      aria-label={`Vendor grade ${grade}`}
    >
      <span className="text-[11px] leading-none">{grade}</span>
    </div>
  );
}
