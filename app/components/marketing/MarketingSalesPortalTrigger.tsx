"use client";

import { useState } from "react";

import SalesAgentSlideOver from "./SalesAgentSlideOver";

interface MarketingSalesPortalTriggerProps {
  className?: string;
  children: React.ReactNode;
}

/** Opens the public sales agent slide-over from marketing hero CTAs. */
export default function MarketingSalesPortalTrigger({
  className,
  children,
}: MarketingSalesPortalTriggerProps) {
  const [isSalesOpen, setIsSalesOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsSalesOpen(true)} className={className}>
        {children}
      </button>
      <SalesAgentSlideOver isOpen={isSalesOpen} onClose={() => setIsSalesOpen(false)} />
    </>
  );
}
