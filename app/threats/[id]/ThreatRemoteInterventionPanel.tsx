'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getRemoteAccessAdminEligibility,
  toggleRemoteAccessAuthorization,
} from '@/app/actions/threatActions';

type Props = {
  threatId: string;
  remoteTechId: string | null;
  isRemoteAccessAuthorized: boolean;
};

/**
 * Level-3 remote tech lane on threat detail: live status + Admin/Owner-only authorize toggle.
 */
export default function ThreatRemoteInterventionPanel({
  threatId,
  remoteTechId,
  isRemoteAccessAuthorized: initialAuthorized,
}: Props) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(initialAuthorized);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [adminEligible, setAdminEligible] = useState(false);

  useEffect(() => {
    setAuthorized(initialAuthorized);
  }, [initialAuthorized]);

  useEffect(() => {
    void getRemoteAccessAdminEligibility().then((r) => setAdminEligible(r.eligible));
  }, []);

  return (
    <section className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-6 shadow-inner shadow-amber-950/30">
      <h2 className="text-sm font-black uppercase tracking-wider text-amber-200">
        Remote intervention (Level 3)
      </h2>
      <p className="mt-1 text-[11px] text-amber-100/80">
        URGENT DISPATCH is active. Technician and access state are mirrored from the Active Risk card.
      </p>

      <div className="mt-4 rounded-lg border border-cyan-900/45 bg-cyan-950/25 p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-cyan-200/95">Live support feed</p>
        <p className="mt-2 text-[11px] leading-relaxed text-cyan-100/90">
          {authorized
            ? 'Status: Tech is currently performing remote remediation.'
            : 'Status: Tech is reviewing your Irontech Diagnostic Packet…'}
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-amber-700/50 bg-amber-950/35 p-3">
        <p className="text-[8px] font-black uppercase tracking-widest text-amber-200/90">Assigned technician</p>
        <p className="mt-1 text-lg font-black text-amber-50">
          {remoteTechId?.trim() ? remoteTechId : 'Pending assignment'}
        </p>
      </div>

      {err && (
        <p className="mt-3 text-[11px] text-rose-400" role="alert">
          {err}
        </p>
      )}

      <button
        type="button"
        disabled={!adminEligible || busy}
        title={
          adminEligible
            ? undefined
            : 'Only Admin/Owner (or IRONFRAME_REMOTE_ACCESS_ADMIN_EMAILS) can authorize remote access.'
        }
        onClick={() => {
          void (async () => {
            setBusy(true);
            setErr(null);
            try {
              const r = await toggleRemoteAccessAuthorization(threatId);
              if (!r.success) {
                setErr(r.error);
                return;
              }
              setAuthorized(r.isRemoteAccessAuthorized);
              router.refresh();
            } catch (e) {
              setErr(e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(false);
            }
          })();
        }}
        className={`mt-4 w-full rounded-lg border px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40 ${
          authorized
            ? 'border-emerald-600/70 bg-emerald-950/40 text-emerald-100 hover:bg-emerald-950/55'
            : 'border-amber-500/60 bg-amber-900/40 text-amber-100 hover:bg-amber-900/55'
        }`}
      >
        {busy ? 'Updating…' : `[🔓 Authorize Remote Access]${authorized ? ' — ON' : ' — OFF'}`}
      </button>
    </section>
  );
}
