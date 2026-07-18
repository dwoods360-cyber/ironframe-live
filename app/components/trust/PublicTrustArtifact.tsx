import Link from "next/link";

import type { ProcurementDocumentSection } from "@/app/lib/legal/procurement";

type Props = {
  title: string;
  subtitle: string;
  sections: readonly ProcurementDocumentSection[];
  artifactLabel: string;
};

export default function PublicTrustArtifact({
  title,
  subtitle,
  sections,
  artifactLabel,
}: Props) {
  return (
    <main className="ironframe-public-funnel mx-auto min-h-screen max-w-4xl px-6 py-10 text-[var(--text-main)]">
      <Link
        href="/trust-center"
        className="font-mono text-[10px] uppercase tracking-widest text-teal-400/90 hover:underline"
      >
        ← Trust Center
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--login-muted)]">{subtitle}</p>
      <p className="mt-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">
        Artifact: {artifactLabel} · design-partner diligence · not legal advice
      </p>

      <div className="mt-10 space-y-6">
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="rounded border border-[var(--login-border)] bg-[var(--bg-secondary)] p-5"
          >
            <h2 className="text-base font-semibold">{section.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--login-muted)]">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-[var(--login-border)] pt-6 text-xs text-slate-500">
        Ironframe is not currently represented as SOC 2 certified. Executed DPAs require Customer
        counsel review and order-form incorporation.
      </p>
    </main>
  );
}
