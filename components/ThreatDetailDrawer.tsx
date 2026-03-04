'use client';

import { useState, useEffect, useMemo } from 'react';
import ThreatDetailClient from '@/app/threats/[id]/ThreatDetailClient';
import ThreatInvestigationPanel from '@/components/ThreatInvestigationPanel';
import { appendAuditLog } from '@/app/utils/auditLogger';
import { useAuditLoggerStore } from '@/app/utils/auditLoggerStore';
import { useRiskStore } from '@/app/store/riskStore';

// # UI_GLASS_LAYER_CONTROLS (Close/X, Minimize, Z-Index) — drawer header + overlay
// # SEARCH_ENGINE_INPUTS (Drawer Search) — drawerSearchQuery
// # GRC_ACTION_CHIPS — delegated to ThreatInvestigationPanel (Save, Email, PDF)
// # ANALYST_NOTES_FEED (Note rendering and DB persistence) — analystNoteDraft, Recent Notes, ThreatDetailClient

/** Clinical GRC risk badges: Red = Critical, Orange = High */
function centsToMillions(value: number): number {
  return value / 100_000_000;
}

/** Clinical GRC risk badges: Red = Critical, Orange = High */
function getRiskBadgeClass(state: string, financialRisk_cents: number, score: number): string {
  const isCritical = financialRisk_cents >= 1_000_000_000 || score >= 9;
  const isHigh = financialRisk_cents >= 500_000_000 || score >= 7;
  if (isCritical) return 'bg-red-600/20 text-red-400 border border-red-500/40';
  if (isHigh) return 'bg-orange-500/20 text-orange-300 border border-orange-500/40';
  if (state === 'RESOLVED') return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
  if (state === 'CONFIRMED') return 'bg-orange-500/20 text-orange-300 border border-orange-500/40';
  if (state === 'ACTIVE') return 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
  if (state === 'DE_ACKNOWLEDGED') return 'bg-slate-600/30 text-slate-400 border border-slate-500/40';
  return 'bg-slate-500/20 text-slate-300 border border-slate-500/40';
}

const STATE_BADGE_CLASS: Record<string, string> = {
  PIPELINE: 'bg-slate-500/20 text-slate-300 border border-slate-500/40',
  ACTIVE: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
  CONFIRMED: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
  RESOLVED: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
  DE_ACKNOWLEDGED: 'bg-slate-600/30 text-slate-400 border border-slate-500/40',
};

function formatAction(action: string): string {
  const map: Record<string, string> = {
    THREAT_ACKNOWLEDGED: 'Acknowledged',
    THREAT_CONFIRMED: 'Confirmed',
    THREAT_RESOLVED: 'Resolved',
    THREAT_DE_ACKNOWLEDGED: 'De-acknowledged',
  };
  return map[action] ?? action.replace(/_/g, ' ');
}

/** Extract the 3-sentence Executive Board Summary from saved AI report markdown */
function extractExecutiveSummary(aiReport: string | null): string | null {
  if (!aiReport?.trim()) return null;
  const heading = '### EXECUTIVE BOARD SUMMARY';
  const idx = aiReport.indexOf(heading);
  if (idx === -1) return null;
  const start = idx + heading.length;
  const rest = aiReport.slice(start);
  const nextHeading = rest.match(/\n###\s/m);
  const end = nextHeading ? nextHeading.index! : rest.length;
  const block = rest.slice(0, end).trim();
  return block || null;
}

type ThreatDetailDrawerProps = {
  threatId: string;
  onClose: () => void;
  /** When set, scroll to this section id after content loads (e.g. "ai-report", "analyst-notes") */
  initialFocusHash?: string;
  /** Called after scroll-to-focus has been attempted so parent can clear focus state */
  onFocusHandled?: () => void;
  /** When true, show LINK INTERRUPTED (e.g. after a save/DB failure). Optional. */
  linkInterrupted?: boolean;
};

type NoteEntry = {
  id?: string;
  text?: string;
  content?: string;
  message?: string;
  operatorId?: string;
  operator_id?: string;
  createdAt?: string;
  created_at?: string;
};

type GlobalAuditEntry = {
  id?: string;
  threat_id?: string;
  action_type?: string;
  description?: string;
  operator_id?: string;
  created_at?: string;
  metadata_tag?: string | null;
  user_id?: string;
  timestamp?: string;
};

type ThreatData = {
  id: string;
  title: string;
  state: string;
  financialRisk_cents: number;
  targetEntity: string;
  sourceAgent: string;
  score: number;
  aiReport: string | null;
  notes?: NoteEntry[];
  workNotes?: NoteEntry[];
  comments?: NoteEntry[];
  auditTrail: { id: string; action: string; operatorId: string | null; createdAt: string }[];
};

function toDrawerThreatData(
  threatId: string,
  threat: {
    id: string;
    name?: string;
    lifecycleState?: string;
    loss?: number;
    score?: number;
    target?: string;
    industry?: string;
    source?: string;
    notes?: string[];
  },
): ThreatData {
  const state = (threat.lifecycleState ?? "pipeline").toUpperCase();
  return {
    id: threatId,
    title: threat.name ?? `Threat ${threatId}`,
    state,
    financialRisk_cents: Math.round((threat.loss ?? threat.score ?? 0) * 100_000_000),
    targetEntity: threat.target ?? threat.industry ?? "Unknown",
    sourceAgent: threat.source ?? "Unknown",
    score: Math.round(threat.score ?? threat.loss ?? 0),
    aiReport: null,
    notes: (threat.notes ?? []).map((text, idx) => ({
      id: `local-${threatId}-${idx}`,
      text,
      operatorId: "Analyst",
      createdAt: new Date().toISOString(),
    })),
    workNotes: [],
    comments: [],
    auditTrail: [],
  };
}

export default function ThreatDetailDrawer({ threatId, onClose, initialFocusHash, onFocusHandled, linkInterrupted = false }: ThreatDetailDrawerProps) {
  const [threat, setThreat] = useState<ThreatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'executive' | 'full'>('executive');
  const [isMinimized, setIsMinimized] = useState(false);
  const [linkStatus, setLinkStatus] = useState<'active' | 'connecting' | 'interrupted'>('active');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [analystNoteDraft, setAnalystNoteDraft] = useState('');
  /** Notes just committed in this session so they appear in the drawer before refetch */
  const [localNotes, setLocalNotes] = useState<NoteEntry[]>([]);
  const globalLogs = useAuditLoggerStore();
  console.log('[GRC DEBUG] Active Threat Data:', JSON.stringify(threat, null, 2));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/threats/${threatId}`)
      .then((res) => {
        if (!res.ok) {
          const fallbackThreat = useRiskStore.getState().threatIndexById[threatId];
          if (res.status === 404 && fallbackThreat) {
            if (!cancelled) {
              setThreat(toDrawerThreatData(threatId, fallbackThreat));
              setError(null);
            }
            return null;
          }
          throw new Error(res.status === 404 ? 'Threat not found' : 'Failed to load');
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) setThreat(data);
      })
      .catch((err) => {
        if (!cancelled) {
          const fallbackThreat = useRiskStore.getState().threatIndexById[threatId];
          if (fallbackThreat) {
            setThreat(toDrawerThreatData(threatId, fallbackThreat));
            setError(null);
            return;
          }
          setError(err instanceof Error ? err.message : 'Failed to load');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [threatId]);

  useEffect(() => {
    if (!threat || !initialFocusHash || !onFocusHandled) return;
    setViewMode('full');
    const el = document.getElementById(initialFocusHash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    onFocusHandled();
  }, [threat, initialFocusHash, onFocusHandled]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const stateLabel = threat ? threat.state.replace(/_/g, ' ') : '';
  const badgeClass = threat
    ? getRiskBadgeClass(threat.state, threat.financialRisk_cents, threat.score)
    : 'bg-slate-500/20 text-slate-300 border border-slate-500/40';
  const executiveSummary = threat?.aiReport ? extractExecutiveSummary(threat.aiReport) : null;
  // Fallback to check common Prisma relation names for notes
  const historicalNotes = [
    ...(threat?.notes ?? []),
    ...(threat?.workNotes ?? []),
    ...(threat?.comments ?? []),
  ];
  const allNotes = useMemo(() => {
    return [...localNotes, ...historicalNotes].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
      return dateB - dateA; // Newest first
    });
  }, [historicalNotes, localNotes]);
  const threatActions = useMemo(() => {
    const activeThreatId = threat?.id;
    if (!activeThreatId) return [];
    return (globalLogs ?? []).filter((raw) => {
      const log = raw as GlobalAuditEntry;
      const taggedThreatId =
        log.threat_id ??
        (() => {
          const tag = log.metadata_tag ?? '';
          const match = tag.match(/threatId:([^|]+)/i);
          return match?.[1]?.trim();
        })();
      return taggedThreatId === activeThreatId;
    });
  }, [globalLogs, threat?.id]);
  const unifiedTimeline = useMemo(() => {
    const notes = allNotes.map((n) => ({
      type: 'NOTE' as const,
      id: n.id,
      actor: n.operatorId || n.operator_id || 'Analyst',
      time: n.createdAt || n.created_at || new Date().toISOString(),
      content: n.text || n.content || n.message || '',
    }));

    const actions = threatActions
      .filter((a) => {
        const action = a as unknown as GlobalAuditEntry;
        return action.action_type !== 'NOTE_ADDED';
      })
      .map((a) => {
      const action = a as unknown as GlobalAuditEntry;
      return {
      type: 'ACTION' as const,
      id: action.id,
      actor: action.operator_id || action.user_id || 'System',
      time: action.created_at || action.timestamp || new Date().toISOString(),
      actionType: action.action_type,
      content: action.description || '',
    };
    });

    return [...notes, ...actions].sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
    );
  }, [allNotes, threatActions]);

  const effectiveLinkStatus = linkInterrupted ? 'interrupted' : linkStatus;

  const glassBg = isDarkMode ? 'bg-slate-900/20' : 'bg-white/20';
  const glassBorder = isDarkMode ? 'border-slate-600/40' : 'border-white/20';
  const glassCard = isDarkMode ? 'bg-slate-900/30 border-slate-600/40' : 'bg-white/30 border-white/30';
  const headerTextClass = isDarkMode ? 'text-blue-400' : 'text-slate-950';
  const bodyTextClass = isDarkMode ? 'text-slate-100' : 'text-slate-950';

  const handleSignOff = () => {
    if (!threat) return;
    appendAuditLog({
      action_type: 'GRC_PROCESS_THREAT',
      log_type: 'GRC',
      description: `Board sign-off acknowledged for threat ${threat.id.slice(0, 8)}… — ${threat.title}`,
      metadata_tag: `threatId:${threat.id}|BOARD_SIGN_OFF`,
    });
    onClose();
  };

  const commitLocalNote = (committedNoteText: string) => {
    if (!committedNoteText) return;
    const newLocalNote: NoteEntry = {
      id: Date.now().toString(),
      text: committedNoteText,
      operatorId: 'Current Analyst',
      createdAt: new Date().toISOString(),
    };
    setLocalNotes((prev) => [newLocalNote, ...prev]);
    setAnalystNoteDraft('');
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-transparent z-[90]"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-full bg-[#020617] border-l border-slate-700/80 shadow-[-20px_0_50px_-15px_rgba(0,0,0,0.7)] z-[100] flex flex-col transform transition-transform duration-300 ${
          isMinimized ? 'w-[80px]' : 'w-[600px]'
        } ${isDarkMode ? 'text-slate-100' : 'text-slate-100'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="threat-drawer-title"
      >
        <div className="flex h-full flex-col">
          {/* # UI_GLASS_LAYER_CONTROLS (Close/X, Minimize, Z-Index) — absolute top-4 right-4 z-[100] above 25% glass */}
          <div
            className={`flex shrink-0 items-start justify-between border-b border-white/20 backdrop-blur-sm ${isMinimized ? 'flex-col gap-2 px-2 py-3' : 'px-4 py-4'} relative`}
            style={{ backgroundColor: 'rgba(30, 58, 138, 0.92)' }}
          >
            {/* X (Close) and — (Minimize) absolutely positioned so always clickable and visible */}
            <div className="absolute top-3 right-3 z-[120] flex items-center gap-1 rounded-md border border-white/25 bg-slate-950/55 p-0.5 shadow-lg">
              <button
                type="button"
                onClick={() => setIsMinimized((v) => !v)}
                className="rounded p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 font-bold text-xl leading-none"
                aria-label={isMinimized ? 'Expand drawer' : 'Minimize drawer'}
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                —
              </button>
            </div>
            <div className={`flex items-center min-w-0 ${isMinimized ? 'flex-col gap-2 w-full' : 'gap-3'}`}>
              {!isMinimized && (
              <div className="min-w-0">
                {loading ? (
                  <p className="text-sm text-white/80">Loading…</p>
                ) : error ? (
                  <p className="text-sm text-red-200">{error}</p>
                ) : threat ? (
                  <>
                    <h2 id="threat-drawer-title" className="text-xl font-bold tracking-tight text-white truncate">
                      {threat.title}
                    </h2>
                    <p className="mt-0.5 font-mono text-xs text-white/70">{threat.id}</p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}
                    >
                      {stateLabel}
                    </span>
                  </>
                ) : null}
              </div>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDarkMode((v) => !v)}
                className="rounded p-2 text-white/90 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode (Night Shift)'}
                title={isDarkMode ? 'Light mode' : 'Night Shift'}
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              {effectiveLinkStatus === 'interrupted' ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${isMinimized ? 'border-red-300 bg-red-50 text-red-700 py-1.5 px-2' : 'border-red-200 bg-red-50 text-red-700 px-3 py-1.5'}`}
                  title="Link interrupted"
                >
                  {!isMinimized && <span className="inline-block h-2 w-2 rounded-full bg-red-500" />}
                  {!isMinimized && 'LINK INTERRUPTED'}
                  {isMinimized && <span className="inline-block h-2 w-2 rounded-full bg-red-500" aria-label="Link interrupted" />}
                </span>
              ) : effectiveLinkStatus === 'connecting' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  {!isMinimized && 'Connecting…'}
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 ${isMinimized ? 'py-1.5 px-2' : 'px-3 py-1.5'}`}
                  title="DMZ Secure Link active"
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {!isMinimized && <span className="text-[10px] font-bold uppercase tracking-wide">DMZ SECURE LINK</span>}
                </span>
              )}
            </div>
          </div>

          {/* Minimized: vertical Pulse indicators (Threat ID rotated, Score badge, Save icon) */}
          {isMinimized && threat && !loading && (
            <div className={`flex flex-1 flex-col items-center justify-start gap-6 py-6 backdrop-blur-xl border-b ${glassBg} ${glassBorder}`}>
              <div
                className={`origin-center whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-widest ${bodyTextClass}`}
                style={{ transform: 'rotate(-90deg)', textShadow: isDarkMode ? '0 0 12px rgba(96,165,250,0.5)' : '0 0 10px rgba(255,255,255,0.5)' }}
              >
                {threat.id.slice(0, 12)}
              </div>
              <span
                className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${badgeClass}`}
              >
                {threat.score}/10
              </span>
              <button
                type="button"
                className={`rounded p-2 hover:bg-white/40 focus:outline-none focus:ring-2 focus:ring-slate-400/50 ${bodyTextClass}`}
                aria-label="Save"
                title="Save"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </button>
            </div>
          )}
          {!isMinimized && threat && !loading && (
            <div className={`flex shrink-0 border-b backdrop-blur-xl px-4 py-2 relative z-50 ${isDarkMode ? 'bg-slate-800/40 border-slate-600/40' : 'bg-white/30 border-white/20'}`}>
              {/* # GRC_ACTION_CHIPS — Executive / Full Technical Audit view toggles */}
              <div className="flex justify-between items-center w-full pb-3 mb-4 border-b border-slate-800/60 mt-2 px-2">
                <div className="flex items-center gap-3">
                  <div className={`flex rounded-lg p-0.5 ${isDarkMode ? 'bg-slate-600/50' : 'bg-slate-400/40'}`}>
                    <button
                      type="button"
                      onClick={() => setViewMode('executive')}
                      className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${bodyTextClass} ${
                        viewMode === 'executive'
                          ? isDarkMode ? 'bg-slate-700/80 shadow-sm' : 'bg-white/75 shadow-sm'
                          : isDarkMode ? 'hover:bg-slate-600/60' : 'hover:bg-white/50'
                      }`}
                    >
                      Executive View
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('full')}
                      className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${bodyTextClass} ${
                        viewMode === 'full'
                          ? isDarkMode ? 'bg-slate-700/80 shadow-sm' : 'bg-white/75 shadow-sm'
                          : isDarkMode ? 'hover:bg-slate-600/60' : 'hover:bg-white/50'
                      }`}
                    >
                      Full Technical Audit
                    </button>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 text-slate-300 hover:text-white transition-colors shadow-sm cursor-pointer z-50"
                  aria-label="Close Drawer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Scrollable body — 25% HUD: blur + theme text/glass */}
          {!isMinimized && (
          <div className={`flex-1 overflow-y-auto backdrop-blur-xl px-4 py-6 ${glassBg}`}>
            {loading && (
              <div className="flex justify-center py-12">
                <p className={`font-medium ${bodyTextClass}`}>Loading threat details…</p>
              </div>
            )}
            {error && (
              <div className="py-8 text-center">
                <p className={`font-medium ${bodyTextClass}`}>{error}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            )}
            {threat && !loading && (
              <div className="space-y-6">
                {viewMode === 'executive' ? (
                  /* Executive View: Risk Badge, 3-sentence summary, Compliance Status, Sign-off */
                  <div className="flex flex-col gap-8 pt-4">
                    <div className={`rounded-2xl border backdrop-blur-xl p-8 shadow-sm ${glassCard}`}>
                      <p className={`text-xs font-bold uppercase tracking-widest ${headerTextClass}`} style={{ textShadow: isDarkMode ? '0 0 12px rgba(96,165,250,0.5)' : '0 0 12px rgba(255,255,255,0.5)' }}>
                        Financial Exposure
                      </p>
                      <p className={`mt-2 text-4xl font-bold tracking-tight ${bodyTextClass}`}>
                        ${centsToMillions(threat.financialRisk_cents).toFixed(1)}M
                      </p>
                      <p className={`mt-1 text-sm ${bodyTextClass}`}>Estimated liability at risk</p>
                    </div>

                    <div className={`flex items-center gap-3 rounded-xl backdrop-blur-xl px-5 py-4 ${isDarkMode ? 'border-emerald-500/50 bg-emerald-900/40' : 'border border-emerald-400/50 bg-emerald-100/60'}`}>
                      <span className="flex h-3 w-3 shrink-0 rounded-full bg-emerald-600" aria-hidden />
                      <div>
                        <p className={`text-sm font-bold ${headerTextClass}`} style={{ textShadow: isDarkMode ? '0 0 10px rgba(96,165,250,0.4)' : '0 0 10px rgba(255,255,255,0.4)' }}>Compliance Status</p>
                        <p className={`text-sm ${bodyTextClass}`}>
                          Board summary reviewed — GRC controls mapped. Awaiting leadership decision.
                        </p>
                      </div>
                    </div>

                    <div className={`rounded-2xl border backdrop-blur-xl p-8 shadow-sm ${glassCard}`}>
                      <h3 className={`text-sm font-bold uppercase tracking-wide ${headerTextClass}`} style={{ textShadow: isDarkMode ? '0 0 12px rgba(96,165,250,0.5)' : '0 0 12px rgba(255,255,255,0.5)' }}>
                        Board-Level Executive Summary
                      </h3>
                      {executiveSummary ? (
                        <p className={`mt-4 text-lg leading-relaxed whitespace-pre-wrap ${bodyTextClass}`}>
                          {executiveSummary}
                        </p>
                      ) : (
                        <p className={`mt-4 ${bodyTextClass}`}>
                          Run the CoreIntel Agent and save the report to generate the Board Summary.
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleSignOff}
                      className="w-full rounded-xl py-4 text-lg font-bold text-white shadow-lg transition-colors hover:opacity-95"
                      style={{ backgroundColor: '#1e3a8a' }}
                    >
                      Sign-off
                    </button>
                  </div>
                ) : (
                  /* Full Technical Audit: complete forensic report, NIST mappings, action chips */
                <>
                <section className={`rounded-xl border backdrop-blur-xl p-4 shadow-sm ${glassCard}`}>
                  <h3
                    className={`mb-3 text-xs font-bold uppercase tracking-wide ${headerTextClass}`}
                    style={{ textShadow: isDarkMode ? '0 0 12px rgba(96,165,250,0.5)' : '0 0 12px rgba(255,255,255,0.5)' }}
                  >
                    Risk Information & History
                  </h3>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className={`text-xs ${bodyTextClass}`}>Financial Liability</dt>
                      <dd className="font-bold text-red-800">${centsToMillions(threat.financialRisk_cents).toFixed(1)}M</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${bodyTextClass}`}>Affected System</dt>
                      <dd className={`font-medium ${bodyTextClass}`}>{threat.targetEntity}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${bodyTextClass}`}>Detecting Agent</dt>
                      <dd className={`font-medium ${bodyTextClass}`}>{threat.sourceAgent}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${bodyTextClass}`}>Score</dt>
                      <dd className={`font-medium ${bodyTextClass}`}>{threat.score}/10</dd>
                    </div>
                  </dl>
                  <div className={`mt-4 border-t pt-4 ${isDarkMode ? 'border-slate-600/40' : 'border-white/30'}`}>
                    <h4 className={`text-xs font-bold uppercase tracking-wide ${headerTextClass}`} style={{ textShadow: isDarkMode ? '0 0 10px rgba(96,165,250,0.4)' : '0 0 10px rgba(255,255,255,0.4)' }}>State changes</h4>
                    <ul className="mt-2 space-y-1.5">
                      {((threat?.auditTrail) ?? []).length === 0 ? (
                        <li className={`text-xs ${bodyTextClass}`}>No state changes recorded yet.</li>
                      ) : (
                        (() => {
                          const trail = (threat?.auditTrail) ?? [];
                          // # DATE_STATE_LOGIC: sort by descending time (newest on top), dedupe consecutive identical states (same user within 5s)
                          const sorted = [...trail].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                          const FIVE_SEC = 5000;
                          const deduped = sorted.filter((entry, i) => {
                            if (i === 0) return true;
                            const prev = sorted[i - 1];
                            const prevTime = new Date(prev.createdAt).getTime();
                            const entryTime = new Date(entry.createdAt).getTime();
                            const sameAction = prev.action === entry.action;
                            const sameUser = (prev.operatorId ?? '') === (entry.operatorId ?? '');
                            const within5s = prevTime - entryTime <= FIVE_SEC;
                            if (sameAction && sameUser && within5s) return false;
                            return true;
                          });
                          return deduped.map((entry) => (
                          <li
                            key={entry.id}
                            className={`flex flex-wrap items-baseline gap-2 border-l-2 pl-2 text-xs ${isDarkMode ? 'border-slate-500' : 'border-slate-500'} ${bodyTextClass}`}
                          >
                            <span className={`font-medium ${bodyTextClass}`}>{formatAction(entry.action)}</span>
                            <span className={bodyTextClass}>
                              {new Date(entry.createdAt).toLocaleString()}
                            </span>
                            {entry.operatorId && (
                              <span className={bodyTextClass}>by {entry.operatorId}</span>
                            )}
                          </li>
                          ));
                        })()
                      )}
                    </ul>
                  </div>
                </section>

                {/* # ANALYST_NOTES_FEED (Note rendering and DB persistence) — Recent Notes list + Analyst Notes & Actions */}
                <section className={`rounded-xl border backdrop-blur-xl p-4 shadow-sm ${glassCard}`}>
                  <h3
                    className={`mb-3 text-xs font-bold uppercase tracking-wide ${headerTextClass}`}
                    style={{ textShadow: isDarkMode ? '0 0 12px rgba(96,165,250,0.5)' : '0 0 12px rgba(255,255,255,0.5)' }}
                  >
                    Recent Notes
                  </h3>
                  <div className="flex-1 overflow-y-auto pr-2 mb-4 max-h-[300px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {unifiedTimeline.length === 0 ? (
                      <div className="text-sm text-slate-500 italic p-4 text-center border border-dashed border-slate-700/50 rounded-md">
                        No investigation evidence recorded yet.
                      </div>
                    ) : (
                      unifiedTimeline.map((item, index) => (
                        <div key={item.id || index} className="mb-3 p-3 bg-slate-900/60 border border-slate-700/50 rounded-md">
                          <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-800">
                            <span className={`text-xs font-bold ${item.type === 'ACTION' ? 'text-amber-500' : 'text-blue-400'}`}>
                              {item.actor} {item.type === 'ACTION' && `[${item.actionType}]`}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(item.time).toLocaleString()}
                            </span>
                          </div>
                          <p className={`text-sm ${item.type === 'ACTION' ? 'text-slate-400 italic' : 'text-slate-300 whitespace-pre-wrap'}`}>
                            {item.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* # ANALYST_NOTES_FEED — Analyst Notes textarea + Save Note; Commit in panel also appends to useAuditLoggerStore */}
                <section id="analyst-notes" className={`rounded-xl border backdrop-blur-xl p-4 shadow-sm ${glassCard}`}>
                  <h3
                    className={`mb-3 text-xs font-bold uppercase tracking-wide ${headerTextClass}`}
                    style={{ textShadow: isDarkMode ? '0 0 12px rgba(96,165,250,0.5)' : '0 0 12px rgba(255,255,255,0.5)' }}
                  >
                    Analyst Notes & Actions
                  </h3>
                  <ThreatDetailClient
                    threatId={threat.id}
                    note={analystNoteDraft}
                    onNoteChange={setAnalystNoteDraft}
                    onNoteCommitted={commitLocalNote}
                  />
                </section>

                {/* # GRC_ACTION_CHIPS (Save, Email, PDF Export) — ThreatInvestigationPanel; INITIATE RISK ASSESSMENT button */}
                <section id="ai-report">
                  <ThreatInvestigationPanel
                    threatId={threat.id}
                    threatTitle={threat.title}
                    financialRisk_cents={threat.financialRisk_cents}
                    savedAiReport={threat.aiReport ?? undefined}
                    isDarkMode={isDarkMode}
                    drawerSearchQuery=""
                    analystNoteDraft={analystNoteDraft}
                    onNoteCommitted={commitLocalNote}
                    analystNotes={
                      (() => {
                        const notes = (threat?.notes) ?? [];
                        if (notes.length === 0) return '';
                        return notes
                          .map(
                            (n) =>
                              `${n.text ?? n.content ?? ''}\n— ${n.operatorId ?? 'Analyst'}, ${new Date(n.createdAt || n.created_at || 0).toLocaleString()}`
                          )
                          .join('\n\n');
                      })()
                    }
                  />
                </section>
              </>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </>
  );
}
