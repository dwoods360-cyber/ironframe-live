"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  getAutonomousCarbonMitigation,
  setAutonomousCarbonMitigation,
} from "@/app/actions/carbonMitigationConfigActions";

const MIN_J = 50;

export default function AdminCarbonConfigPage() {
  const [enabled, setEnabled] = useState(false);
  const [daysActive, setDaysActive] = useState(0);
  const [activeSince, setActiveSince] = useState<string | null>(null);
  const [justification, setJustification] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    void getAutonomousCarbonMitigation().then((r) => {
      if (!r.ok) return;
      setEnabled(r.enabled);
      setDaysActive(r.daysActive);
      setActiveSince(r.activeSince);
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const next = !enabled;
    const res = await setAutonomousCarbonMitigation(next, justification);
    setBusy(false);
    if (!res.ok) {
      setStatus(res.error);
      return;
    }
    setEnabled(res.enabled);
    setJustification("");
    setStatus(`Autonomous Carbon Mitigation is now ${res.enabled ? "ON" : "OFF"}. Governance log recorded.`);
    refresh();
  };

  const jLen = justification.trim().length;
  const jOk = jLen >= MIN_J;

  return (
    <div className="min-h-full bg-[#050509] p-6">
      <p className="mb-4 text-[10px] text-slate-500">
        <Link href="/settings/config" className="text-cyan-400 hover:underline">
          ← System configuration
        </Link>
      </p>
      <section className="max-w-lg rounded border border-emerald-800/50 bg-slate-900/50 p-4">
        <h1 className="mb-2 text-[12px] font-black uppercase tracking-widest text-emerald-200">
          Autonomous carbon mitigation
        </h1>
        <p className="mb-4 text-[10px] leading-relaxed text-slate-400">
          Agent 6 (Ironlock) may insert governance delays on non-critical background agents when the grid is in a dirty
          carbon window and this self-healing mode is enabled. Each change requires a {MIN_J}-character justification.
        </p>

        <div className="mb-4 flex items-center justify-between rounded border border-slate-700 bg-slate-950/50 px-3 py-2">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-200">
              Autonomous Carbon Mitigation (Self-Healing Mode)
            </p>
            <p className="text-[10px] text-slate-500">Current: {enabled ? "ON" : "OFF"}</p>
            {enabled ? (
              <p className="mt-1 text-[10px] text-emerald-300/90">
                Resilience streak: {daysActive} full day{daysActive === 1 ? "" : "s"} toward 30-day +0.5 maturity bonus
                {activeSince ? (
                  <span className="block font-mono text-[9px] text-slate-500">Since {activeSince}</span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-[10px] text-slate-400">
            Justification ({jLen}/{MIN_J} min)
            <textarea
              value={justification}
              onChange={(ev) => setJustification(ev.target.value)}
              rows={4}
              className="mt-1 w-full rounded border border-slate-700 bg-black/40 p-2 font-mono text-[10px] text-slate-200"
              placeholder="Document why you are enabling or disabling autonomous throttling (minimum 50 characters)."
              required
              minLength={MIN_J}
            />
          </label>
          <button
            type="submit"
            disabled={busy || !jOk}
            className="w-full rounded border border-emerald-600/70 bg-emerald-950/40 py-2 text-[10px] font-black uppercase text-emerald-200 disabled:opacity-40"
          >
            {busy ? "Saving…" : `Turn ${enabled ? "OFF" : "ON"}`}
          </button>
        </form>

        {status ? (
          <p className="mt-3 text-[10px] text-cyan-200/90" role="status">
            {status}
          </p>
        ) : null}
      </section>
    </div>
  );
}
