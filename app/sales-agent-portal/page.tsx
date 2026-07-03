"use client";

import Link from "next/link";
import { useState } from "react";

import SalesAgentSlideOver from "@/app/components/marketing/SalesAgentSlideOver";

/** Public entry for the marketing sales specialist slide-over. */
export default function SalesAgentPortalPage() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <main className="ironframe-public-landing flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-6 text-[var(--text-main)]">
      <SalesAgentSlideOver isOpen={isOpen} onClose={() => setIsOpen(false)} />
      {!isOpen ? (
        <div className="max-w-md space-y-4 text-center">
          <p className="font-mono text-xs tracking-widest text-[var(--login-muted)] uppercase">
            Sales specialist session closed
          </p>
          <Link
            href="/"
            className="inline-flex h-11 touch-manipulation items-center justify-center rounded-lg bg-[var(--login-accent)] px-6 font-mono text-sm font-bold text-[var(--bg-primary)]"
          >
            Return to homepage
          </Link>
        </div>
      ) : null}
    </main>
  );
}
