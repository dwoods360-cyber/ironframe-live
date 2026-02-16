"use client";

import { Shield } from "lucide-react";
import { VendorLetterGrade } from "@/utils/scoringEngine";

type ScorecardIconProps = {
  grade: VendorLetterGrade;
  className: string;
  onClick?: () => void;
};

export default function ScorecardIcon({ grade, className, onClick }: ScorecardIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-[18px] w-[18px] items-center justify-center ${className}`}
      aria-label={`Vendor grade ${grade}`}
    >
      <Shield data-testid="scorecard-shield" className="absolute h-[18px] w-[18px] fill-current opacity-25 stroke-[1.8]" />
      <span className="relative text-[11px] font-black leading-none">{grade}</span>
    </button>
  );
}
