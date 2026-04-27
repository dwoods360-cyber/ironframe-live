"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, Trash2, X } from "lucide-react";
import { NotificationChannelType } from "@prisma/client";
import {
  createNotificationEndpoint,
  deleteNotificationEndpoint,
  listNotificationEndpoints,
  setNotificationEndpointEnabled,
  testWebhookConnection,
  type NotificationEndpointListRow,
} from "@/app/actions/notificationEndpointActions";

type Props = {
  open: boolean;
  onClose: () => void;
  onRegistryChanged: () => void;
};

const CHANNEL_OPTIONS: { value: NotificationChannelType; label: string }[] = [
  { value: NotificationChannelType.SLACK, label: "Slack" },
  { value: NotificationChannelType.TEAMS, label: "Teams" },
  { value: NotificationChannelType.WEBHOOK, label: "Webhook" },
];

export default function NotificationEndpointsModal({ open, onClose, onRegistryChanged }: Props) {
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<NotificationEndpointListRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formType, setFormType] = useState<NotificationChannelType>(NotificationChannelType.SLACK);
  const [formError, setFormError] = useState<string | null>(null);
  const [testBusyId, setTestBusyId] = useState<string | null>(null);
  const [testFlash, setTestFlash] = useState<Record<string, { ok: boolean; message: string }>>({});

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await listNotificationEndpoints();
      setRows(list);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load endpoints");
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      const res = await createNotificationEndpoint({
        name: formName,
        url: formUrl,
        channelType: formType,
        isEnabled: true,
      });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setFormName("");
      setFormUrl("");
      await reload();
      onRegistryChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this notification endpoint?")) return;
    setBusy(true);
    try {
      const res = await deleteNotificationEndpoint(id);
      if (!res.ok) {
        setLoadError(res.error);
        return;
      }
      await reload();
      onRegistryChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleEnabled(id: string, next: boolean) {
    setBusy(true);
    try {
      const res = await setNotificationEndpointEnabled(id, next);
      if (!res.ok) {
        setLoadError(res.error);
        return;
      }
      await reload();
      onRegistryChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleTestConnection(id: string) {
    setTestBusyId(id);
    setTestFlash((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const res = await testWebhookConnection(id);
      if (res.ok) {
        setTestFlash((prev) => ({ ...prev, [id]: { ok: true, message: "Success" } }));
      } else {
        const msg =
          res.httpStatus != null ? `Error HTTP ${res.httpStatus}: ${res.error}` : `Error: ${res.error}`;
        setTestFlash((prev) => ({ ...prev, [id]: { ok: false, message: msg } }));
      }
      await reload();
      onRegistryChanged();
    } finally {
      setTestBusyId(null);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Manage notification endpoints"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-lg border border-zinc-700 bg-[#08080c] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-200">
            Stakeholder webhooks
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-8rem)] overflow-y-auto px-4 py-3">
          <p className="text-[9px] leading-relaxed text-zinc-500">
            URLs are encrypted at rest and validated by Irongate (Agent 14) on save and before every broadcast.
            Only https hosts on the allowlist (Slack, Teams, Discord, PagerDuty, …) or{" "}
            <span className="font-mono text-zinc-400">IRONFRAME_WEBHOOK_HOST_ALLOWLIST</span>.
          </p>

          {loadError ? (
            <p className="mt-2 text-[9px] text-rose-400/90">{loadError}</p>
          ) : null}

          <ul className="mt-3 space-y-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-1.5 rounded-md border border-zinc-800/90 bg-zinc-950/60 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-[9px] text-zinc-400">
                    <input
                      type="checkbox"
                      checked={r.isEnabled}
                      disabled={busy}
                      onChange={(e) => void handleToggleEnabled(r.id, e.target.checked)}
                    />
                    <span className="font-semibold text-zinc-200">{r.name}</span>
                    <span className="rounded border border-zinc-700 px-1 font-mono text-[8px] uppercase text-zinc-500">
                      {r.channelType}
                    </span>
                  </label>
                  {r.lastProbeOk === false ? (
                    <span
                      className="text-sm leading-none text-amber-500"
                      title={r.lastProbeDetail ?? "Last connectivity test failed"}
                      aria-label="Warning: last test failed; endpoint remains enabled"
                    >
                      ⚠️
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate font-mono text-[8px] text-zinc-600">{r.urlMasked}</span>
                  <button
                    type="button"
                    disabled={busy || testBusyId === r.id}
                    onClick={() => void handleTestConnection(r.id)}
                    className="shrink-0 rounded border border-zinc-600 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-zinc-300 hover:border-emerald-600/50 hover:text-emerald-300 disabled:opacity-50"
                  >
                    {testBusyId === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      "Test"
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDelete(r.id)}
                    className="shrink-0 rounded border border-rose-900/50 p-1.5 text-rose-400 hover:bg-rose-950/40 disabled:opacity-40"
                    aria-label={`Delete ${r.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {testFlash[r.id] ? (
                  <div
                    className={`flex items-center gap-1 text-[8px] ${
                      testFlash[r.id]?.ok ? "text-emerald-400/90" : "text-rose-400/90"
                    }`}
                  >
                    {testFlash[r.id]?.ok ? (
                      <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
                    ) : null}
                    <span>{testFlash[r.id]?.message}</span>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {rows.length === 0 && !loadError ? (
            <p className="mt-3 text-[9px] text-zinc-600">No endpoints yet. Add one below.</p>
          ) : null}

          <form onSubmit={(e) => void handleAdd(e)} className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Add endpoint</p>
            <input
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Name (e.g. Teams Security Channel)"
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-200 placeholder:text-zinc-600"
            />
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as NotificationChannelType)}
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-200"
            >
              {CHANNEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              required
              type="url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/…"
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-[9px] text-zinc-200 placeholder:text-zinc-600"
              autoComplete="off"
            />
            {formError ? <p className="text-[9px] text-rose-400/90">{formError}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded border border-emerald-700/50 bg-emerald-950/30 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-50"
            >
              Add endpoint
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
