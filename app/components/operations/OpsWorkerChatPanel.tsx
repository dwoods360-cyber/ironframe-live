"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchOpsPortalJson } from "@/app/utils/fetchOpsPortalJson";
import { OPS_CHAT_TARGETS, type OpsChatTarget } from "@/app/lib/operations/opsWorkerIds";
import {
  bindOpsWorkerSpeechVoices,
  cancelOpsWorkerSpeech,
  getOpsWorkerVoicePitch,
  getOpsWorkerVoiceRate,
  isOpsWorkerVoiceMuted,
  setOpsWorkerVoiceMuted,
  setOpsWorkerVoicePitch,
  setOpsWorkerVoiceRate,
  speakOpsWorkerReply,
} from "@/app/lib/operations/opsWorkerSpeech";

type ChatTurn = { role: "user" | "assistant"; text: string };

const PTT_MIC_KEY = "ironframe-ops-worker-ptt-mic-device-id";
const WORKER_KEY = "ironframe-ops-worker-chat-target";

const TARGET_LABEL: Record<OpsChatTarget, string> = {
  ironboard: "IronBoard",
  ironleads: "Ironleads",
  salesteam: "SalesTeam",
  "success-team": "IronSuccessTeam",
  "support-team": "IronSupportTeam",
};

function emptyThreads(): Record<OpsChatTarget, ChatTurn[]> {
  return {
    ironboard: [],
    ironleads: [],
    salesteam: [],
    "success-team": [],
    "support-team": [],
  };
}

function pickRecorderMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const mime of candidates) {
    try {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    } catch {
      /* ignore */
    }
  }
  return "";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

/** One Ops Hub conversation + one PTT — pick IronBoard or a perimeter worker. */
export default function OpsWorkerChatPanel({
  initialWorker = "ironboard",
}: {
  initialWorker?: OpsChatTarget;
}) {
  const [worker, setWorker] = useState<OpsChatTarget>(initialWorker);
  const [threads, setThreads] = useState<Record<OpsChatTarget, ChatTurn[]>>(emptyThreads);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [micDeviceId, setMicDeviceId] = useState("");
  const [micOptions, setMicOptions] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [voiceRate, setVoiceRate] = useState(1);
  const [voicePitch, setVoicePitch] = useState(1);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptBoxRef = useRef<HTMLDivElement | null>(null);
  const workerRef = useRef(worker);
  workerRef.current = worker;

  const turns = threads[worker] ?? [];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(WORKER_KEY);
      if (saved && (OPS_CHAT_TARGETS as readonly string[]).includes(saved)) {
        setWorker(saved as OpsChatTarget);
      }
      setVoiceMuted(isOpsWorkerVoiceMuted());
      setVoiceRate(getOpsWorkerVoiceRate());
      setVoicePitch(getOpsWorkerVoicePitch());
    } catch {
      /* ignore */
    }
    const unbind = bindOpsWorkerSpeechVoices();
    return () => {
      unbind();
      cancelOpsWorkerSpeech();
    };
  }, []);

  useEffect(() => {
    cancelOpsWorkerSpeech();
  }, [worker]);

  const refreshMics = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const probe = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      probe.getTracks().forEach((t) => t.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices
        .filter((d) => d.kind === "audioinput")
        .filter((d) => d.deviceId !== "default" && d.deviceId !== "communications")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${i + 1}`,
        }));
      setMicOptions(inputs);
      const saved =
        typeof window !== "undefined" ? window.localStorage.getItem(PTT_MIC_KEY) || "" : "";
      if (saved && inputs.some((d) => d.deviceId === saved)) {
        setMicDeviceId(saved);
      }
    } catch {
      setStatus("Mic list unavailable — allow microphone permission to use PTT.");
    }
  }, []);

  useEffect(() => {
    void refreshMics();
    const onChange = () => void refreshMics();
    navigator.mediaDevices?.addEventListener?.("devicechange", onChange);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", onChange);
  }, [refreshMics]);

  useEffect(() => {
    transcriptBoxRef.current?.scrollTo({ top: transcriptBoxRef.current.scrollHeight });
  }, [turns, busy, worker]);

  const sendMessage = async (raw: string) => {
    const message = raw.trim();
    const activeWorker = workerRef.current;
    if (!message || busy) return;
    setBusy(true);
    setStatus("");
    const history = (threads[activeWorker] ?? []).slice(-8);
    setThreads((prev) => ({
      ...prev,
      [activeWorker]: [...(prev[activeWorker] ?? []), { role: "user", text: message }],
    }));
    setPrompt("");
    try {
      const data = await fetchOpsPortalJson<{ reply?: string }>(
        "/api/admin/operations-hub/worker-chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ worker: activeWorker, message, history }),
        },
        "Worker chat failed.",
      );
      const reply = (data.reply ?? "").trim() || "(Empty reply.)";
      setThreads((prev) => ({
        ...prev,
        [activeWorker]: [...(prev[activeWorker] ?? []), { role: "assistant", text: reply }],
      }));
      speakOpsWorkerReply(reply, activeWorker);
    } catch (err) {
      const fail = err instanceof Error ? err.message : "Worker chat failed.";
      setStatus(fail);
      setThreads((prev) => ({
        ...prev,
        [activeWorker]: [
          ...(prev[activeWorker] ?? []),
          { role: "assistant", text: `Error: ${fail}` },
        ],
      }));
    } finally {
      setBusy(false);
    }
  };

  const stopPttAndSubmit = async () => {
    const recorder = recorderRef.current;
    if (!recorder || !recording) return;
    setRecording(false);
    setBusy(true);
    setStatus("PTT: transcribing…");

    const elapsedMs = Date.now() - startedAtRef.current;
    const blob = await new Promise<Blob>((resolve) => {
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        resolve(
          new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          }),
        );
      };
      recorder.onstop = done;
      try {
        recorder.requestData();
      } catch {
        /* ignore */
      }
      try {
        recorder.stop();
      } catch {
        done();
      }
      setTimeout(done, 1500);
    });

    streamRef.current?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* ignore */
      }
    });
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];

    if (elapsedMs < 700) {
      setStatus("PTT: hold at least ~1s while speaking, then click again.");
      setBusy(false);
      return;
    }
    if (!blob || blob.size < 256) {
      setStatus("PTT: no audio captured — check mic permission.");
      setBusy(false);
      return;
    }

    try {
      const audioBase64 = await blobToBase64(blob);
      const data = await fetchOpsPortalJson<{ transcript?: string }>(
        "/api/admin/operations-hub/worker-voice/transcribe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64,
            mimeType: blob.type || "audio/webm",
          }),
        },
        "PTT transcribe failed.",
      );
      const transcript = (data.transcript ?? "").trim();
      if (!transcript) {
        setStatus("PTT: heard silence — pick another mic and retry.");
        setBusy(false);
        return;
      }
      setStatus(`PTT: “${transcript.length > 80 ? `${transcript.slice(0, 80)}…` : transcript}”`);
      setBusy(false);
      await sendMessage(transcript);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "PTT failed.");
      setBusy(false);
    }
  };

  const startPtt = async () => {
    if (busy || recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("PTT unavailable in this browser.");
      return;
    }
    try {
      await refreshMics();
      const audioConstraint: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (micDeviceId) {
        audioConstraint.deviceId = { exact: micDeviceId };
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint });
      streamRef.current = stream;
      const mime = pickRecorderMime();
      chunksRef.current = [];
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.start(200);
      startedAtRef.current = Date.now();
      setRecording(true);
      const trackLabel = stream.getAudioTracks()[0]?.label || "mic";
      setStatus(
        `PTT → ${TARGET_LABEL[worker]} via ${trackLabel} — speak, then click PTT again.`,
      );
    } catch {
      setStatus("PTT mic denied — allow Microphone for this site.");
    }
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Conversation + PTT</h2>
          <p className="mt-1 text-sm text-slate-400">
            One PTT / Ask box for IronBoard and the perimeter workers. Replies use the same board
            voice pipeline (shared Jenny/Aria pack + speed/pitch). Portal buttons still run
            harvest/poll; Approvals still DISPATCH.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:min-w-[14rem]">
          <label className="block text-xs text-slate-400">
            Talking to
            <select
              value={worker}
              disabled={busy || recording}
              onChange={(e) => {
                const next = e.target.value as OpsChatTarget;
                setWorker(next);
                try {
                  localStorage.setItem(WORKER_KEY, next);
                } catch {
                  /* ignore */
                }
              }}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-50"
            >
              {OPS_CHAT_TARGETS.map((id) => (
                <option key={id} value={id}>
                  {TARGET_LABEL[id]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              const next = !voiceMuted;
              setVoiceMuted(next);
              setOpsWorkerVoiceMuted(next);
              if (next) cancelOpsWorkerSpeech();
            }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              voiceMuted
                ? "border-slate-600 bg-slate-800 text-slate-300"
                : "border-cyan-700/70 bg-cyan-950/40 text-cyan-200"
            }`}
            title={voiceMuted ? "Worker replies are muted" : "Worker replies are spoken aloud"}
          >
            {voiceMuted ? "Voice muted" : "Voice on"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
        <p className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-500 sm:w-auto">
          Board voice (shared)
        </p>
        <label className="flex min-w-[10rem] flex-1 items-center gap-2 text-xs text-slate-400">
          Speed
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.05}
            value={voiceRate}
            onChange={(e) => {
              const next = parseFloat(e.target.value);
              setVoiceRate(next);
              setOpsWorkerVoiceRate(next);
            }}
            className="w-full accent-cyan-500"
            aria-label="Voice speed (shared with Ironboard)"
          />
          <span className="w-12 shrink-0 font-mono text-[11px] text-slate-300">
            {voiceRate.toFixed(2)}x
          </span>
        </label>
        <label className="flex min-w-[10rem] flex-1 items-center gap-2 text-xs text-slate-400">
          Pitch
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={voicePitch}
            onChange={(e) => {
              const next = parseFloat(e.target.value);
              setVoicePitch(next);
              setOpsWorkerVoicePitch(next);
            }}
            className="w-full accent-cyan-500"
            aria-label="Voice pitch (shared with Ironboard)"
          />
          <span className="w-10 shrink-0 font-mono text-[11px] text-slate-300">
            {voicePitch.toFixed(2)}
          </span>
        </label>
      </div>

      <div
        ref={transcriptBoxRef}
        className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/50 p-3"
      >
        {turns.length === 0 ? (
          <p className="text-sm text-slate-500">
            Ask {TARGET_LABEL[worker]} what to run next, how to prioritize, or how to phrase a step.
          </p>
        ) : (
          turns.map((turn, i) => (
            <div
              key={`${worker}-${turn.role}-${i}`}
              className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                turn.role === "user"
                  ? "border border-slate-700 bg-slate-900 text-slate-100"
                  : "border border-cyan-900/40 bg-cyan-950/20 text-cyan-50"
              }`}
            >
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {turn.role === "user" ? "You" : TARGET_LABEL[worker]}
              </div>
              {turn.text}
            </div>
          ))
        )}
      </div>

      <form
        className="mt-4 space-y-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          void sendMessage(prompt);
        }}
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          disabled={busy || recording}
          placeholder={`Ask ${TARGET_LABEL[worker]}…`}
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-50"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={micDeviceId}
            disabled={busy || recording}
            onChange={(e) => {
              const id = e.target.value;
              setMicDeviceId(id);
              try {
                if (id) localStorage.setItem(PTT_MIC_KEY, id);
                else localStorage.removeItem(PTT_MIC_KEY);
              } catch {
                /* ignore */
              }
            }}
            className="min-w-[12rem] flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200 disabled:opacity-50"
            aria-label="PTT microphone"
            title="Leave as Windows default to follow Sound → Input"
          >
            <option value="">Windows default</option>
            {micOptions.map((mic) => (
              <option key={mic.deviceId} value={mic.deviceId}>
                {mic.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy && !recording}
            onClick={() => {
              if (recording) void stopPttAndSubmit();
              else void startPtt();
            }}
            className={`rounded-lg border px-4 py-2 text-sm font-bold uppercase ${
              recording
                ? "border-rose-500 text-rose-200 shadow-[0_0_0.45rem_rgba(248,113,113,0.35)]"
                : "border-slate-600 bg-slate-800 text-slate-100 hover:border-cyan-600"
            } disabled:opacity-50`}
            title="One PTT for Ops Hub — routes to IronBoard or the selected worker"
          >
            {recording ? "REC" : "PTT"}
          </button>
          <button
            type="submit"
            disabled={busy || recording || prompt.trim().length < 2}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {busy ? "Working…" : "Ask"}
          </button>
        </div>
      </form>
      {status ? <p className="mt-2 text-xs text-amber-300">{status}</p> : null}
    </section>
  );
}
