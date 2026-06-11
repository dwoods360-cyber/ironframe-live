"use client";

import React from "react";

/** Inline interactive glossary helper context on hover (Feature 6 ledger feed). */
export const LogStatusBadge: React.FC<{ type: "SHADOW" | "VERIFIED" }> = ({ type }) => {
  const infoText =
    type === "VERIFIED"
      ? "VERIFIED: Cryptographic check passed. Zero structural drift detected. Financial values verified in BigInt cents."
      : "SHADOW: Raw real-time background snapshot captured by Ironwatch for continuous observation.";

  return (
    <span
      className={`cursor-help rounded border px-1.5 py-0.5 text-[9px] font-bold ${
        type === "VERIFIED"
          ? "border-teal-500/30 bg-teal-500/10 text-teal-400"
          : "border-purple-500/30 bg-purple-500/10 text-purple-400"
      }`}
      title={infoText}
    >
      {type}
    </span>
  );
};
