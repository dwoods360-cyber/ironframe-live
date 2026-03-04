'use client';

import React, { useState } from 'react';
import type { ChangeEvent } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useRiskStore } from '@/app/store/riskStore';
import { useKimbotStore } from '@/app/store/kimbotStore';
import { useGrcBotStore } from '@/app/store/grcBotStore';
import { appendAuditLog } from '@/app/utils/auditLogger';
import { useAgentStore } from '@/app/store/agentStore';

const STAKEHOLDER_EMAIL_RECIPIENT = 'blackwoodscoffee@gmail.com';

type RiskRow = {
  id: string;
  title: string;
  source: string;
  threatId?: string | null;
  score_cents: number;
  company: { name: string; sector: string };
  isSimulation?: boolean;
};

type Props = { risks: RiskRow[]; setSelectedThreatId?: (id: string | null) => void };

type LifecycleState = 'active' | 'confirmed' | 'resolved';

type WorkNote = { timestamp: string; text: string; user: string };

/**
 * Supply Chain Impact (1–10) for vendor/third-party artifacts.
 * When liabilityInMillions is provided (e.g. from GRCBOT): >$5M → 9.0+, <$1M → 3.0, else linear scale.
 * Otherwise falls back to text-based heuristic (Patient Records / Core Infrastructure → 9.2).
 */
function computeSupplyChainImpact(input: {
  title?: string;
  name?: string;
  description?: string;
  source?: string;
  /** Liability in $M (e.g. threat.loss or threat.score from GRCBOT). Used for impact when present. */
  liabilityInMillions?: number;
}): number | null {
  const title = (input.title ?? input.name ?? "").toLowerCase();
  const desc = (input.description ?? "").toLowerCase();
  const src = (input.source ?? "").toLowerCase();

  const isSupplyChain =
    src.includes("vendor") ||
    src.includes("nth-party") ||
    src.includes("third") ||
    desc.includes("vendor artifact") ||
    desc.includes("nth-party") ||
    title.includes("vendor") ||
    title.includes("third-party") ||
    title.includes("third party") ||
    title.includes("artifact");

  if (!isSupplyChain) return null;

  const liabilityM = input.liabilityInMillions;
  if (liabilityM != null && typeof liabilityM === "number") {
    if (liabilityM > 5) return 9.2;
    if (liabilityM < 1) return 3.0;
    return 3 + (liabilityM - 1) * (9 - 3) / 4; // linear 3–9 for $1M–$5M
  }

  const hasCriticalAccess =
    title.includes("patient records") ||
    title.includes("core infrastructure") ||
    desc.includes("patient records") ||
    desc.includes("core infrastructure");

  return hasCriticalAccess ? 9.2 : 8.6;
}

export default function ActiveRisksClient({ risks, setSelectedThreatId: setSelectedThreatIdProp }: Props) {
  const activeThreats = useRiskStore((state) => state.activeThreats);
  const confirmThreat = useRiskStore((state) => state.confirmThreat);
  const resolveThreat = useRiskStore((state) => state.resolveThreat);
  const selectedTenantName = useRiskStore((state) => state.selectedTenantName);
  const storeSetSelectedThreatId = useRiskStore((state) => state.setSelectedThreatId);
  const setSelectedThreatId = setSelectedThreatIdProp ?? storeSetSelectedThreatId;

  const kimbotEnabled = useKimbotStore((s) => s.enabled);
  const grcBotEnabled = useGrcBotStore((s) => s.enabled);
  const enginesOn = kimbotEnabled || grcBotEnabled;

  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [workNotes, setWorkNotes] = useState<Record<string, WorkNote[]>>({});
  const [states, setStates] = useState<Record<string, LifecycleState>>({});
  const [successFlash, setSuccessFlash] = useState<Record<string, boolean>>({});
  const [riskSearchQuery, setRiskSearchQuery] = useState('');

  // Only show DB risks that are non-simulation when engines are OFF + optional tenant filter
  const filteredRisks = risks.filter((r) => {
    if (!enginesOn && r.isSimulation === true) return false;
    if (selectedTenantName && r.company.name !== selectedTenantName) return false;
    return true;
  });
  // Only show activeThreats that are non-simulation (no grcbot-/kimbot- ids) when engines are OFF
  const filteredActiveThreats = activeThreats.filter(
    (t) => {
      if (!enginesOn && (t.id.startsWith("grcbot-") || t.id.startsWith("kimbot-"))) return false;
      if (selectedTenantName) {
        // Best-effort tenant filter: if threat has a target, match it; otherwise hide to avoid cross-tenant bleed.
        return (t.target ?? "") === selectedTenantName;
      }
      return true;
    }
  );

  const visibleRisks = filteredRisks.filter((r) => states[r.id] !== 'resolved');
  const visibleActiveThreats = filteredActiveThreats.filter(
    (t) => (states[t.id] ?? t.lifecycleState ?? 'active') !== 'resolved'
  );

  const searchLower = riskSearchQuery.trim().toLowerCase();

  const searchedActiveThreats = searchLower
    ? visibleActiveThreats.filter((t) => {
        const id = t.id?.toLowerCase() ?? '';
        const name = t.name?.toLowerCase() ?? '';
        const desc = t.description?.toLowerCase() ?? '';
        const source = t.source?.toLowerCase() ?? '';
        const target = (t.target as string | undefined)?.toLowerCase() ?? '';
        const industry = t.industry?.toLowerCase() ?? '';
        return (
          id.includes(searchLower) ||
          name.includes(searchLower) ||
          desc.includes(searchLower) ||
          source.includes(searchLower) ||
          target.includes(searchLower) ||
          industry.includes(searchLower)
        );
      })
    : visibleActiveThreats;

  const searchedRisks = searchLower
    ? visibleRisks.filter((r) => {
        const id = r.id?.toLowerCase() ?? '';
        const title = r.title?.toLowerCase() ?? '';
        const source = r.source?.toLowerCase() ?? '';
        const company = r.company.name?.toLowerCase() ?? '';
        const sector = r.company.sector?.toLowerCase() ?? '';
        return (
          id.includes(searchLower) ||
          title.includes(searchLower) ||
          source.includes(searchLower) ||
          company.includes(searchLower) ||
          sector.includes(searchLower)
        );
      })
    : visibleRisks;

  const sortedActiveThreats = [...searchedActiveThreats].sort(
    (a, b) =>
      (b.calculatedRiskScore ?? b.score ?? b.loss ?? 0) -
      (a.calculatedRiskScore ?? a.score ?? a.loss ?? 0),
  );
  const sortedRisks = [...searchedRisks].sort((a, b) => b.score_cents - a.score_cents);

  const isEmpty = sortedActiveThreats.length === 0 && sortedRisks.length === 0;

  const handleAddNote = (riskId: string) => {
    const draft = (noteDrafts[riskId] ?? '').trim();
    if (!draft) return;
    const note: WorkNote = {
      timestamp: new Date().toISOString(),
      text: draft,
      user: 'Dereck',
    };
    setWorkNotes((prev) => ({
      ...prev,
      [riskId]: [...(prev[riskId] ?? []), note],
    }));
    setNoteDrafts((prev) => ({ ...prev, [riskId]: '' }));
  };

  const handleConfirmThreat = async (risk: RiskRow) => {
    setStates((prev) => ({ ...prev, [risk.id]: 'confirmed' }));
    setSuccessFlash((prev) => ({ ...prev, [risk.id]: true }));
    setTimeout(() => {
      setSuccessFlash((prev) => ({ ...prev, [risk.id]: false }));
    }, 1500);

    const notesText = (workNotes[risk.id] ?? []).map((n) => n.text).join(' | ') || 'None';
    const template = `URGENT: GRC Event Registered. Threat: ${risk.title}, Liability: $0.0M, Acknowledged By: Dereck, Notes: ${notesText}.`;

    useAgentStore.getState().addStreamMessage(`> [SYSTEM] Stakeholder alert staged for ${STAKEHOLDER_EMAIL_RECIPIENT}.`);

    console.log('Mock sendStakeholderEmail (ActiveRisks)', {
      to: STAKEHOLDER_EMAIL_RECIPIENT,
      body: template,
    });

    appendAuditLog({
      action_type: 'EMAIL_SENT',
      log_type: 'GRC',
      description: template,
    });
    if (risk.threatId) {
      await confirmThreat(risk.threatId, 'admin-user-01');
    } else {
      appendAuditLog({
        action_type: 'SYSTEM_WARNING',
        log_type: 'GRC',
        description: `Confirm skipped: Missing mapped threatId for active risk ${risk.id}`,
        metadata_tag: `activeRiskId:${risk.id}|title:${risk.title}`,
      });
    }
  };

  const handleResolveThreat = async (risk: RiskRow) => {
    setStates((prev) => ({ ...prev, [risk.id]: 'resolved' }));
    if (risk.threatId) {
      await resolveThreat(risk.threatId, 'admin-user-01');
    } else {
      appendAuditLog({
        action_type: 'SYSTEM_WARNING',
        log_type: 'GRC',
        description: `Resolve skipped: Missing mapped threatId for active risk ${risk.id}`,
        metadata_tag: `activeRiskId:${risk.id}|title:${risk.title}`,
      });
    }
  };

  return (
    <div className="p-6 font-sans">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-white font-sans">ACTIVE RISKS</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
          {sortedActiveThreats.length + sortedRisks.length} Live Findings
        </span>
      </div>

      <div className="mb-3">
        <input
          type="search"
          value={riskSearchQuery}
          onChange={(e) => setRiskSearchQuery(e.target.value)}
          placeholder="Search active risks by name or ID, target, sector, or source…"
          className="w-full rounded border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Search active risks"
        />
      </div>

      <div className="space-y-3">
        {isEmpty ? (
          <div className="rounded border border-slate-800 bg-slate-950/40 p-4 text-center font-sans text-sm text-slate-500">
            [ WAITING FOR RISK CONFIRMATION... ]
          </div>
        ) : (
          <>
        {sortedActiveThreats.map((threat) => {
          const lifecycle: LifecycleState =
            (states[threat.id] as LifecycleState | undefined) ??
            ((threat.lifecycleState as LifecycleState | undefined) ?? 'active');
          const notes = workNotes[threat.id] ?? (threat.workNotes ?? []);
          const userNotesText = (threat.userNotes ?? '').trim();
          const isExpanded = true;
          const liabilityM = threat.score ?? threat.loss;
          const supplyChainImpact = computeSupplyChainImpact({
            name: threat.name,
            description: threat.description,
            source: threat.source,
            liabilityInMillions: typeof liabilityM === "number" ? liabilityM : undefined,
          });

          const buttonLabel =
            lifecycle === 'active' ? 'CONFIRM THREAT' : lifecycle === 'confirmed' ? 'RESOLVE THREAT' : 'RESOLVED';

          const onPrimaryClick =
            lifecycle === 'active'
              ? async () => {
                  await confirmThreat(threat.id, 'admin-user-01');
                  setStates((prev) => ({ ...prev, [threat.id]: 'confirmed' }));
                  setSuccessFlash((prev) => ({ ...prev, [threat.id]: true }));
                  setTimeout(() => setSuccessFlash((prev) => ({ ...prev, [threat.id]: false })), 1500);
                }
              : lifecycle === 'confirmed'
              ? async () => {
                  setStates((prev) => ({ ...prev, [threat.id]: 'resolved' }));
                  await resolveThreat(threat.id, 'admin-user-01');
                }
              : undefined;

          return (
            <div
              key={`active-${threat.id}`}
              className="group flex flex-col justify-between rounded-lg border border-emerald-700/40 bg-emerald-950/10 p-4 transition-colors hover:border-emerald-500/60"
            >
              <div className="flex w-full items-start justify-between text-left">
                <div>
                  <h3 className="text-sm font-medium text-slate-200">
                    <Link
                      href={`/threats/${threat.id}`}
                      onClick={(e) => { e.preventDefault(); setSelectedThreatId(threat.id); }}
                      className="hover:text-blue-200 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-950 rounded"
                    >
                      {threat.name}
                    </Link>
                  </h3>
                  <p className="mt-1 font-mono text-[10px] text-slate-500">{threat.id}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Target: <span className="text-slate-400">{threat.target ?? threat.industry ?? 'Healthcare'}</span>
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">{threat.description ?? 'No additional details provided.'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Link
                    href={`/threats/${threat.id}`}
                    onClick={(e) => { e.preventDefault(); setSelectedThreatId(threat.id); }}
                    className="inline-flex items-center gap-1 rounded border border-slate-600 bg-slate-800/80 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-200 transition-colors hover:border-blue-500/60 hover:bg-blue-500/10 hover:text-blue-200"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden />
                    Assess Risk
                  </Link>
                  <span className={`text-xs font-bold ${(threat.calculatedRiskScore ?? 0) > 70 ? 'text-red-400' : 'text-amber-400'}`}>
                    Score: {threat.calculatedRiskScore ?? threat.score ?? threat.loss}
                  </span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
                    SRC: {threat.source ?? 'STRATEGIC_INTEL'}
                  </span>
                  {supplyChainImpact != null && (
                    <span
                      className={`mt-1 text-[9px] font-bold uppercase tracking-wide ${
                        supplyChainImpact >= 8.5 ? "text-rose-300" : "text-amber-300"
                      }`}
                      title="Supply Chain Impact (third-party/vendor risk, 1–10). Distinct from internal security alerts."
                    >
                      Supply Chain Impact: {supplyChainImpact.toFixed(1)}/10
                    </span>
                  )}
                  <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    {lifecycle === 'active' ? 'Just Acknowledged' : lifecycle === 'confirmed' ? 'Confirmed' : 'Resolved'}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 space-y-3 rounded-md border border-slate-800 bg-slate-950/60 p-3">
                  <div className="space-y-1">
                    {userNotesText && (
                      <div className="rounded border border-slate-700 bg-slate-900/70 p-2">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">User Notes</p>
                        <p className="mt-1 text-[10px] text-slate-200">{userNotesText}</p>
                      </div>
                    )}

                    <div className="max-h-28 space-y-1 overflow-y-auto rounded bg-slate-950/80 p-2">
                      {notes.length === 0 && (
                        <div className="text-[10px] text-slate-500">No work notes recorded yet.</div>
                      )}
                      {notes.map((note) => (
                        <div key={note.timestamp + note.text} className="text-[10px] text-slate-300">
                          <span className="font-mono text-slate-500">
                            {new Date(note.timestamp).toLocaleTimeString()} · {note.user}:
                          </span>{' '}
                          <span>{note.text}</span>
                        </div>
                      ))}
                    </div>

                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
                      Append Work Note
                    </label>
                    <textarea
                      rows={2}
                      value={noteDrafts[threat.id] ?? ''}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                        setNoteDrafts((prev) => ({ ...prev, [threat.id]: e.target.value }))
                      }
                      placeholder="Log analyst progress, containment steps, or remediation status..."
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddNote(threat.id)}
                      className="mt-1 inline-flex items-center rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-200 hover:border-emerald-400 hover:text-emerald-200"
                    >
                      Add Note
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {successFlash[threat.id] && (
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                        Stakeholders Notified
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={!onPrimaryClick}
                      onClick={onPrimaryClick}
                      className={`ml-auto rounded px-3 py-1.5 text-[10px] font-black uppercase tracking-wide shadow ${
                        lifecycle === 'active'
                          ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                          : 'bg-amber-500 text-black hover:bg-amber-400'
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {buttonLabel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {sortedRisks.map((risk) => {
          const lifecycle: LifecycleState = states[risk.id] ?? 'active';
          const notes = workNotes[risk.id] ?? [];
          const isExpanded = true;
          const supplyChainImpact = computeSupplyChainImpact({
            title: risk.title,
            source: risk.source,
          });

          const buttonLabel =
            lifecycle === 'active' ? 'CONFIRM THREAT' : lifecycle === 'confirmed' ? 'RESOLVE THREAT' : 'RESOLVED';

          const onPrimaryClick =
            lifecycle === 'active'
              ? () => handleConfirmThreat(risk)
              : lifecycle === 'confirmed'
              ? () => handleResolveThreat(risk)
              : undefined;

          return (
            <div
              key={risk.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (risk.threatId) setSelectedThreatId(risk.threatId);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && risk.threatId) setSelectedThreatId(risk.threatId);
              }}
              className="group flex cursor-pointer flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-blue-500/50"
            >
              <div className="flex w-full items-start justify-between text-left">
                <div>
                  <h3 className="text-sm font-medium text-slate-200 group-hover:text-blue-200 group-hover:underline">{risk.title}</h3>
                  <p className="mt-1 font-mono text-[10px] text-slate-500">{risk.id}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Target: <span className="text-slate-400">{risk.company.name}</span> ({risk.company.sector})
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-xs font-bold ${risk.score_cents > 80 ? 'text-red-400' : 'text-amber-400'}`}>
                    Score: {risk.score_cents}
                  </span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
                    SRC: {risk.source}
                  </span>
                  {supplyChainImpact != null && (
                    <span
                      className={`mt-1 text-[9px] font-bold uppercase tracking-wide ${
                        supplyChainImpact >= 8.5 ? "text-rose-300" : "text-amber-300"
                      }`}
                      title="Supply Chain Impact (third-party/vendor risk, 1–10). Distinct from internal security alerts."
                    >
                      Supply Chain Impact: {supplyChainImpact.toFixed(1)}/10
                    </span>
                  )}
                  <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    {lifecycle === 'active'
                      ? 'Just Acknowledged'
                      : lifecycle === 'confirmed'
                      ? 'Confirmed'
                      : 'Resolved'}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 space-y-3 rounded-md border border-slate-800 bg-slate-950/60 p-3">
                  <div className="max-h-28 space-y-1 overflow-y-auto rounded bg-slate-950/80 p-2">
                    {notes.length === 0 && (
                      <div className="text-[10px] text-slate-500">No work notes recorded yet.</div>
                    )}
                    {notes.map((note) => {
                      return (
                        <div key={note.timestamp + note.text} className="text-[10px] text-slate-300">
                          <span className="font-mono text-slate-500">
                            {new Date(note.timestamp).toLocaleTimeString()} · {note.user}:
                          </span>{' '}
                          <span>{note.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
                      Append Work Note
                    </label>
                    <textarea
                      rows={2}
                      value={noteDrafts[risk.id] ?? ''}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                        setNoteDrafts((prev) => ({ ...prev, [risk.id]: e.target.value }))
                      }
                      placeholder="Log analyst progress, containment steps, or remediation status..."
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddNote(risk.id)}
                      className="mt-1 inline-flex items-center rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-200 hover:border-emerald-400 hover:text-emerald-200"
                    >
                      Add Note
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {successFlash[risk.id] && (
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                        Stakeholders Notified
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={!onPrimaryClick}
                      onClick={onPrimaryClick}
                      className={`ml-auto rounded px-3 py-1.5 text-[10px] font-black uppercase tracking-wide shadow ${
                        lifecycle === 'active'
                          ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                          : 'bg-amber-500 text-black hover:bg-amber-400'
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {buttonLabel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
          </>
        )}
      </div>
    </div>
  );
}
