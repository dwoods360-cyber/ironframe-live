'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAIReportToThreat, addWorkNoteAction } from '@/app/actions/threatActions';
import { sendInvestigationEmail } from '@/app/actions/email';
import { appendAuditLog } from '@/app/utils/auditLogger';
import { maskSensitiveData } from '@/app/utils/retentionPolicy';
import { useAgentStore } from '@/app/store/agentStore';
import { useRiskStore } from '@/app/store/riskStore';

// # GRC_ACTION_CHIPS (Save, Email, PDF Export) — Commit Evidence, Email Stakeholders, Export PDF; INITIATE RISK ASSESSMENT
// # ANALYST_NOTES_FEED — Commit button appends NOTE_ADDED to useAuditLoggerStore so notes appear in sidebar immediately

const PARAM_OPTIONS = [
  'Threat Intel & Web Search',
  'Compliance Impact (NIST/ISO)',
  'Remediation Plan',
  'Vendor Risk Analysis',
];

interface PanelProps {
  threatId: string;
  threatTitle: string;
  financialRisk_cents?: number;
  /** Saved AI report from DB (used for full export when present). */
  savedAiReport?: string | null;
  /** Full-text analyst notes from DB (appended after AI report in email/PDF). */
  analystNotes?: string | null;
  /** When true, use dark glass and high-contrast action chips. */
  isDarkMode?: boolean;
  /** Optional search to filter NIST controls / AI findings in the drawer. */
  drawerSearchQuery?: string;
  /** Pending analyst note (from drawer); when Commit Evidence is clicked, save this first and emit NOTE_ADDED. */
  analystNoteDraft?: string;
  /** Called with the committed note text so the drawer can show it locally; then drawer clears draft. */
  onNoteCommitted?: (committedNoteText: string) => void;
}

export default function ThreatInvestigationPanel({ threatId, threatTitle, financialRisk_cents = 0, savedAiReport, analystNotes, isDarkMode = false, drawerSearchQuery = '', analystNoteDraft = '', onNoteCommitted }: PanelProps) {
  const router = useRouter();
  const [parameters, setParameters] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'connection_error'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const activeIndustry = useRiskStore((s) => s.selectedIndustry);
  const activeTenant = useRiskStore((s) => s.selectedTenantName);
  const scopeTag = `industry:${activeIndustry}|tenant:${activeTenant ?? 'GLOBAL'}|threatId:${threatId}`;

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCheckboxChange = (param: string) => {
    setParameters((prev) =>
      prev.includes(param) ? prev.filter((p) => p !== param) : [...prev, param]
    );
  };

  /** Ensures report is persisted (and audit logged). Returns true if already saved or save succeeded. Skips save when report is empty (avoids overwriting with blank). */
  const ensureReportSaved = async (): Promise<boolean> => {
    if (saveStatus === 'saved') return true;
    if (!report.trim()) return true; // Nothing to save; use savedAiReport for export/email
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const result = await saveAIReportToThreat(threatId, report);
      if (result.success) {
        setSaveStatus('saved');
        appendAuditLog({
          action_type: 'AI_REPORT_SAVED',
          log_type: 'GRC',
          description: `CoreIntel Agent saved findings for threat ${threatId.slice(0, 8)}…`,
          metadata_tag: scopeTag,
        });
        router.refresh();
        return true;
      }
      setSaveStatus('error');
      return false;
    } catch {
      setSaveStatus('connection_error');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const deployAgent = async () => {
    if (parameters.length === 0) {
      alert('Please select at least one research parameter.');
      return;
    }

    setIsAnalyzing(true);
    setReport('');
    try {
      const response = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threatId,
          threatTitle,
          financialRisk_cents,
          parameters,
        }),
      });
      const data = (await response.json()) as { report?: string; error?: string };
      if (response.ok) {
        setReport(data.report ?? '');
      } else {
        setReport('Error: ' + (data.error ?? 'Unknown error'));
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setReport('Failed to connect to the CoreIntel Agent.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveReport = async () => {
    const noteText = analystNoteDraft?.trim();
    // # ANALYST_NOTES_FEED: append to audit store immediately so sidebar shows note; notify drawer to show locally
    if (noteText) {
      const noteSnippet = noteText.length > 250 ? `${noteText.substring(0, 250)}...` : noteText;
      appendAuditLog({
        action_type: 'NOTE_ADDED',
        log_type: 'GRC',
        description: `Analyst Note: ${noteSnippet}`,
        metadata_tag: scopeTag,
        user_id: 'analyst',
      });
      onNoteCommitted?.(noteText);
      try {
        await addWorkNoteAction(threatId, noteText, 'analyst');
      } catch (e) {
        console.error('[Commit] Failed to save note:', e);
      }
    }
    appendAuditLog({
      action_type: 'AI_REPORT_SAVED',
      log_type: 'GRC',
      description: `Evidence committed for threat ${threatId.slice(0, 8)}…`,
      metadata_tag: scopeTag,
    });
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const result = await saveAIReportToThreat(threatId, report);
      if (result.success) {
        setSaveStatus('saved');
        router.refresh();
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('connection_error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailStakeholders = async () => {
    // # GRC_ACTION_CHIPS — terminal log + audit store + toast
    const systemMessage = '> [SYSTEM] Secure Briefing dispatched to blackwoodscoffee@gmail.com';
    useAgentStore.getState().addStreamMessage(systemMessage);
    appendAuditLog({
      action_type: 'EMAIL_SENT',
      log_type: 'GRC',
      description: systemMessage,
      metadata_tag: scopeTag,
      user_id: 'analyst',
    });
    showToast('Email Dispatched');
    const saved = await ensureReportSaved();
    if (!saved) return;
    setIsEmailing(true);
    try {
      const result = await sendInvestigationEmail(threatId, threatTitle, fullReportText, fullNotesText || undefined);
      if (result.success) setEmailSent(true);
    } finally {
      setIsEmailing(false);
    }
  };

  const handleExportPDF = async () => {
    const saved = await ensureReportSaved();
    if (!saved) return;
    setIsExporting(true);
    let pdfContainer: HTMLDivElement | null = null;
    try {
      const mod = await import('html2pdf.js');
      const html2pdf = mod.default ?? mod;
      const escapeHtml = (value: string) =>
        value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      // GRC PII/PHI: mask only the copy used for export; do not mutate React state or UI.
      const reportForPdf = maskSensitiveData((fullReportText || savedAiReport || '').trim());
      const notesForPdf = fullNotesText ? maskSensitiveData(fullNotesText) : '';
      pdfContainer = document.createElement('div');
      pdfContainer.style.backgroundColor = '#ffffff';
      pdfContainer.style.color = '#1e293b';
      pdfContainer.style.border = '1px solid #e2e8f0';
      pdfContainer.style.borderRadius = '8px';
      pdfContainer.style.padding = '24px';
      pdfContainer.style.fontFamily = 'Arial, sans-serif';
      pdfContainer.style.maxWidth = '800px';
      pdfContainer.innerHTML = `
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="margin: 0; color: #0f172a;">Threat Export Dossier</h2>
          <p style="margin: 6px 0 0; color: #475569; font-size: 12px;">Threat ID: ${escapeHtml(threatId)}</p>
          <p style="margin: 4px 0 0; color: #475569; font-size: 12px;">Title: ${escapeHtml(threatTitle)}</p>
        </div>
        <h3 style="margin: 0 0 8px 0; color: #0f172a;">Investigation Report</h3>
        <pre style="white-space: pre-wrap; margin: 0; background-color: #f8fafc; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">${escapeHtml(reportForPdf || '')}</pre>
        ${
          notesForPdf
            ? `<h3 style="margin: 16px 0 8px 0; color: #0f172a;">Analyst Notes</h3>
               <pre style="white-space: pre-wrap; margin: 0; background-color: #f8fafc; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">${escapeHtml(notesForPdf)}</pre>`
            : ''
        }
      `;
      document.body.appendChild(pdfContainer);
      const opts = {
        margin: 1,
        filename: `Threat_Brief_${threatId}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const },
      };
      const worker = html2pdf().set(opts).from(pdfContainer).toPdf();
      const pdfBlob = (await worker.outputPdf('blob')) as Blob;
      const url = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Threat_Export_${threatId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      appendAuditLog({
        action_type: 'EXPORT_PDF',
        log_type: 'GRC',
        description: `Analyst exported PDF dossier for Threat ${threatId}`,
        metadata_tag: scopeTag,
        user_id: 'analyst',
      });
    } catch (err) {
      console.error('[PDF] Export failed:', err);
    } finally {
      if (pdfContainer && document.body.contains(pdfContainer)) {
        document.body.removeChild(pdfContainer);
      }
      setIsExporting(false);
    }
  };

  const fullReportText = (report || savedAiReport || '').trim();
  const fullNotesText = (analystNotes ?? '').trim();
  const hasReportContent = report || savedAiReport;

  const searchLower = drawerSearchQuery.trim().toLowerCase();
  const filterReportBySearch = (text: string) => {
    if (!searchLower || !text) return text;
    const lines = text.split('\n');
    const matched = lines.filter((line) => line.toLowerCase().includes(searchLower));
    return matched.length > 0 ? matched.join('\n') : text;
  };
  const displayedReportText = searchLower ? filterReportBySearch(fullReportText) : fullReportText;
  const displayedNotesText = searchLower ? filterReportBySearch(fullNotesText) : fullNotesText;

  const panelBg = isDarkMode ? 'bg-slate-900/30 border-slate-600/40' : 'bg-white/25 border-white/30';
  const bodyText = isDarkMode ? 'text-slate-100' : 'text-slate-950';
  const headerText = isDarkMode ? 'text-blue-400' : 'text-slate-950';

  return (
    <div className={`rounded-xl border backdrop-blur-2xl p-6 shadow-sm ${panelBg}`}>
      {/* # GRC_ACTION_CHIPS — toast for Email Dispatched */}
      {toastMessage && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 z-[200] -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          {toastMessage}
        </div>
      )}
      <h2
        className={`mb-4 text-base font-bold tracking-tight ${headerText}`}
        style={{ textShadow: isDarkMode ? '0 0 12px rgba(96,165,250,0.5)' : '0 0 12px rgba(255,255,255,0.5)' }}
      >
        CoreIntel GRC Agent
      </h2>

      <div className="mb-6 flex flex-col gap-3">
        <span className={`text-xs font-semibold uppercase tracking-wide ${bodyText}`}>
          Research Parameters
        </span>
        {PARAM_OPTIONS.map((param) => (
          <label
            key={param}
            className={`flex cursor-pointer items-center gap-2 font-medium ${bodyText}`}
          >
            <input
              type="checkbox"
              checked={parameters.includes(param)}
              onChange={() => handleCheckboxChange(param)}
              className="h-4 w-4 rounded border-slate-300 bg-white text-[#1e3a8a] focus:ring-[#1e3a8a]"
            />
            {param}
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={deployAgent}
        disabled={isAnalyzing}
        className="rounded-lg px-6 py-2 font-semibold text-white transition-all disabled:opacity-70"
        style={{ backgroundColor: '#1e3a8a' }}
      >
        {isAnalyzing ? 'Agent is analyzing...' : 'INITIATE RISK ASSESSMENT'}
      </button>

      {hasReportContent ? (
        <div className={`mt-6 rounded-lg border backdrop-blur-2xl p-4 ${panelBg}`}>
          <h4 className={`mb-2 font-bold ${headerText}`} style={{ textShadow: isDarkMode ? '0 0 10px rgba(96,165,250,0.4)' : '0 0 10px rgba(255,255,255,0.4)' }}>Agent Report:</h4>
          <div id="ai-report-content" className={`rounded border p-3 backdrop-blur-xl ${isDarkMode ? 'bg-slate-800/40 border-slate-600/40' : 'bg-white/40 border-white/30'}`}>
            <div className="pdf-section">
              <pre className={`whitespace-pre-wrap font-sans text-sm leading-relaxed ${bodyText}`}>
                {displayedReportText}
              </pre>
            </div>
            {fullNotesText ? (
              <div className={`pdf-section mt-4 pt-4 border-t ${isDarkMode ? 'border-slate-600/40' : 'border-white/30'}`} style={{ pageBreakBefore: 'always' }}>
                <h5 className={`mb-2 text-xs font-bold uppercase tracking-wide ${headerText}`}>Analyst Notes</h5>
                <pre className={`whitespace-pre-wrap font-sans text-sm leading-relaxed ${bodyText}`}>
                  {displayedNotesText}
                </pre>
              </div>
            ) : null}
          </div>

          {/* # GRC_ACTION_CHIPS (Save, Email, PDF Export) — z-50 so chips stay on top of 25% glass; Email logs to terminal (blackwoodscoffee@gmail.com) */}
          <div className={`mt-4 flex flex-wrap gap-3 border-t pt-4 relative z-50 ${isDarkMode ? 'border-slate-600/40' : 'border-white/30'}`}>
            <button
              type="button"
              onClick={handleSaveReport}
              disabled={isSaving || saveStatus === 'saved'}
              className={`rounded-lg px-4 py-2 font-semibold text-white shadow-md border transition-colors hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70 ${
                isDarkMode ? 'bg-slate-800/80 border-slate-600/60 hover:bg-slate-700/90' : 'border-white/30'
              }`}
              style={!isDarkMode ? { backgroundColor: 'rgba(30, 58, 138, 0.85)' } : undefined}
            >
              {saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'saved'
                  ? 'Committed to Ledger'
                  : saveStatus === 'error'
                    ? 'Error saving report.'
                    : saveStatus === 'connection_error'
                      ? 'Connection error.'
                      : 'Commit Evidence to Ledger'}
            </button>
            <button
              type="button"
              onClick={handleEmailStakeholders}
              disabled={isEmailing || emailSent}
              className={`rounded-lg px-4 py-2 font-medium shadow-md transition-colors hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70 ${
                isDarkMode
                  ? 'bg-slate-800/80 border border-slate-600/60 text-slate-100 hover:bg-slate-700/90'
                  : 'border border-white/50 bg-white/75 text-slate-950 hover:bg-white/90'
              }`}
            >
              {isEmailing ? 'Sending...' : emailSent ? 'Email Sent!' : 'Email Stakeholders'}
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExporting}
              className={`rounded-lg px-4 py-2 font-medium shadow-md transition-colors hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70 ${
                isDarkMode
                  ? 'bg-slate-800/80 border border-slate-600/60 text-slate-100 hover:bg-slate-700/90'
                  : 'border border-white/50 bg-white/75 text-slate-950 hover:bg-white/90'
              }`}
            >
              {isExporting ? 'Generating PDF...' : 'Export as PDF'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
