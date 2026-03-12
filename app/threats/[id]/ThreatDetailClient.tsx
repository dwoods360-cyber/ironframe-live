'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addWorkNoteAction } from '@/app/actions/threatActions';
import { appendAuditLog } from '@/app/utils/auditLogger';
import { useRiskStore } from '@/app/store/riskStore';

const CONTEXT_CHIPS = ['False Positive', 'Critical Priority', 'Pending Patch', 'Under Review', 'Escalated'];

type Props = {
  threatId: string;
  /** Controlled note value (when provided by drawer for Commit Evidence flow). */
  note?: string;
  onNoteChange?: (value: string) => void;
  /** Optional optimistic callback so parent drawer can render the note immediately. */
  onNoteCommitted?: (text: string) => void;
};

export default function ThreatDetailClient({ threatId, note: controlledNote, onNoteChange, onNoteCommitted }: Props) {
  const [internalNote, setInternalNote] = useState('');
  const note = onNoteChange ? (controlledNote ?? '') : internalNote;
  const setNote = onNoteChange ? (onNoteChange as (v: string) => void) : setInternalNote;
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();
  const activeIndustry = useRiskStore((s) => s.selectedIndustry);
  const activeTenant = useRiskStore((s) => s.selectedTenantName);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;
    setSaveError(null);
    setPending(true);
    try {
      const result = await addWorkNoteAction(threatId, text, 'analyst');
      if (result.success === false) {
        setSaveError(result.error ?? 'Failed to save note.');
        return;
      }
      const noteSnippet = text.length > 250 ? `${text.substring(0, 250)}...` : text;
      appendAuditLog({
        action_type: 'NOTE_ADDED',
        log_type: 'GRC',
        description: `Analyst Note: ${noteSnippet}`,
        metadata_tag: `industry:${activeIndustry}|tenant:${activeTenant ?? 'GLOBAL'}|threatId:${threatId}`,
        user_id: 'analyst',
      });
      onNoteCommitted?.(text);
      setNote('');
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save note.');
    } finally {
      setPending(false);
    }
  }

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setNote(v);
  };

  function appendChip(label: string) {
    const next = note ? `${note} [${label}]` : `[${label}]`;
    setNote(next);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Analyst Notes
        </label>
        <textarea
          id="noteText"
          name="noteText"
          value={note}
          onChange={handleNoteChange}
          placeholder="Add a work note (e.g. triage outcome, next steps…)"
          rows={4}
          className="w-full rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500">Append context:</span>
          {CONTEXT_CHIPS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => appendChip(label)}
              className="rounded-full border border-slate-600 bg-slate-700/80 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-600 hover:text-white"
            >
              {label}
            </button>
          ))}
        </div>
        {saveError && (
          <p className="text-sm font-bold text-red-500" role="alert">{saveError}</p>
        )}
        <button
          type="submit"
          disabled={pending || !note.trim()}
          className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save Note'}
        </button>
      </form>
    </>
  );
}
