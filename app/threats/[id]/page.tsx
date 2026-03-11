import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import ThreatDetailClient from './ThreatDetailClient';
import ThreatInvestigationPanel from '@/components/ThreatInvestigationPanel';
import ThreatDetailHashScroll from './ThreatDetailHashScroll';

const STATE_BADGE_CLASS: Record<string, string> = {
  PIPELINE: 'bg-slate-500/20 text-slate-300',
  ACTIVE: 'bg-amber-500/20 text-amber-300',
  CONFIRMED: 'bg-orange-500/20 text-orange-300',
  RESOLVED: 'bg-emerald-500/20 text-emerald-300',
  DE_ACKNOWLEDGED: 'bg-slate-600/30 text-slate-400',
};

function centsToMillions(value: bigint | number): string {
  return (Number(value) / 100_000_000).toFixed(1);
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    THREAT_ACKNOWLEDGED: 'Acknowledged',
    THREAT_CONFIRMED: 'Confirmed',
    THREAT_RESOLVED: 'Resolved',
    THREAT_DE_ACKNOWLEDGED: 'De-acknowledged',
  };
  return map[action] ?? action.replace(/_/g, ' ');
}

export default async function ThreatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const threat = await prisma.threatEvent.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { createdAt: 'desc' } },
      auditTrail: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!threat) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
        <h1 className="text-xl font-bold text-white">Threat Not Found</h1>
        <p className="mt-2 text-slate-400">No threat exists with ID: {id}</p>
        <Link
          href="/"
          className="mt-6 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const stateLabel = threat.status.replace(/_/g, ' ');
  const badgeClass = STATE_BADGE_CLASS[threat.status] ?? 'bg-slate-500/20 text-slate-300';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <ThreatDetailHashScroll />
      {/* Header: title, ID, and status only */}
      <header className="border-b border-slate-800 bg-slate-900/60 px-4 py-6 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">{threat.title}</h1>
              <p className="mt-1 font-mono text-sm text-slate-400">{threat.id}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}
            >
              {stateLabel}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/" className="mb-6 inline-block text-xs font-medium text-slate-400 hover:text-white">
          ← Back to Dashboard
        </Link>
        {/* Risk Information & History */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-400">
            Risk Information & History
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500">Financial Liability</dt>
              <dd className="mt-0.5 text-lg font-bold text-red-400">${centsToMillions(threat.financialRisk_cents)}M</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Affected System</dt>
              <dd className="mt-0.5 text-white">{threat.targetEntity}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Detecting Agent</dt>
              <dd className="mt-0.5 text-white">{threat.sourceAgent}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Score</dt>
              <dd className="mt-0.5 text-white">{threat.score}/10</dd>
            </div>
          </dl>

          {/* Timeline */}
          <div className="mt-6 border-t border-slate-800 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              State changes
            </h3>
            <ul className="mt-3 space-y-2">
              {threat.auditTrail.length === 0 ? (
                <li className="text-sm text-slate-500">No state changes recorded yet.</li>
              ) : (
                threat.auditTrail.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-baseline gap-2 border-l-2 border-slate-700 pl-3 text-sm"
                  >
                    <span className="font-medium text-white">{formatAction(entry.action)}</span>
                    <span className="text-slate-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                    {entry.operatorId && (
                      <span className="text-slate-500">by {entry.operatorId}</span>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        {/* Work notes list */}
        {threat.notes.length > 0 && (
          <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
              Work Notes
            </h2>
            <ul className="space-y-3">
              {threat.notes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg border border-slate-700/80 bg-slate-800/50 p-3 text-sm text-slate-200"
                >
                  <p className="whitespace-pre-wrap">{n.text}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(n.createdAt).toLocaleString()} · {n.operatorId}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Analyst Notes & CTA */}
        <section id="analyst-notes" className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-400">
            Analyst Notes & Actions
          </h2>
          <ThreatDetailClient threatId={threat.id} />
        </section>

        {/* CoreIntel Investigation Panel */}
        <section id="ai-report" className="mt-6">
          <ThreatInvestigationPanel
            threatId={threat.id}
            threatTitle={threat.title}
            financialRisk_cents={Number(threat.financialRisk_cents)}
            savedAiReport={threat.aiReport ?? undefined}
            analystNotes={threat.notes.length > 0 ? threat.notes.map((n) => `${n.text}\n— ${n.operatorId}, ${new Date(n.createdAt).toLocaleString()}`).join('\n\n') : undefined}
          />
        </section>
      </main>
    </div>
  );
}
