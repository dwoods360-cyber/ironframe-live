import type { ProcurementDocumentSection } from "@/app/lib/legal/procurement";

type Props = {
  title: string;
  subtitle: string;
  sections: readonly ProcurementDocumentSection[];
  artifactLabel: string;
};

export default function TrustProcurementDocument({
  title,
  subtitle,
  sections,
  artifactLabel,
}: Props) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 text-slate-200">
      <p className="font-mono text-[10px] uppercase tracking-widest text-teal-500/80">
        Procurement &amp; Trust Center
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-50">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{subtitle}</p>
      <p className="mt-3 font-mono text-[9px] uppercase tracking-wider text-slate-600">
        Artifact: {artifactLabel} · v0.1.0-ga-epic17 · design-partner diligence
      </p>

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="rounded border border-slate-800/80 bg-slate-900/40 p-5"
          >
            <h2 className="text-base font-semibold text-slate-100">{section.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-slate-800 pt-6 text-xs text-slate-500">
        This framework supports technical diligence and is not legal advice. Executed DPAs require
        Customer counsel review and order-form incorporation.
      </p>
    </div>
  );
}
