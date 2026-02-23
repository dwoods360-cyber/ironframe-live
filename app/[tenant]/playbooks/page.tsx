import { notFound } from "next/navigation";
import PlaybookChecklist from "./PlaybookChecklist";

const PLAYBOOKS: Record<string, { title: string; steps: string[] }> = {
  medshield: {
    title: "MEDSHIELD - INCIDENT PLAYBOOKS",
    steps: ["Patient Data Exposure Containment", "Clinical System Isolation", "Regulatory Notification Workflow"],
  },
  vaultbank: {
    title: "VAULTBANK - INCIDENT PLAYBOOKS",
    steps: ["SWIFT Message Integrity Triage", "Fraud Escalation Chain", "Settlement Reconciliation Protocol"],
  },
  gridcore: {
    title: "GRIDCORE - INCIDENT PLAYBOOKS",
    steps: ["Grid Instability Protocol", "Substation Isolation Procedure", "SCADA Recovery Sequence"],
  },
};

export function generateStaticParams() {
  return Object.keys(PLAYBOOKS).map((company) => ({ company }));
}

export default async function EntityPlaybooksPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company } = await params;
  const playbookSet = PLAYBOOKS[company];

  if (!playbookSet) {
    notFound();
  }

  return (
    <div className="min-h-full bg-slate-950 p-6">
      <section className="rounded border border-slate-800 bg-slate-900/40 p-4">
        <h1 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-white">{playbookSet.title}</h1>
        <p className="mb-4 text-[10px] text-slate-400">Incident response checklist for controlled step-by-step execution.</p>

        <PlaybookChecklist steps={playbookSet.steps} />
      </section>
    </div>
  );
}
