"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CallAssistAnswer,
  TranscriptAnalysis,
  WorkflowReviewCallRecap,
} from "@/app/lib/server/workflowReviewCallAssistCore";
import { normalizeLiveTranscriptChunk } from "@/app/lib/operations/liveTranscriptHygiene";
import { persistWorkflowReviewRecap } from "@/app/lib/operations/workflowReviewRecapBridge";
import { fetchOpsPortalJson } from "@/app/utils/fetchOpsPortalJson";
import { parseJsonResponse } from "@/app/utils/parseJsonResponse";

import WorkflowReviewPostYesStrip from "./WorkflowReviewPostYesStrip";
import WorkflowReviewTalkTrackPanel from "./WorkflowReviewTalkTrackPanel";

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

function recordChunk(stream: MediaStream, durationMs: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mime = pickRecorderMime();
    const chunks: Blob[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
    } catch (err) {
      reject(err instanceof Error ? err : new Error("MediaRecorder failed"));
      return;
    }
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };
    recorder.onerror = () => reject(new Error("MediaRecorder error"));
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" }));
    };
    try {
      recorder.start(200);
    } catch (err) {
      reject(err instanceof Error ? err : new Error("MediaRecorder start failed"));
      return;
    }
    window.setTimeout(() => {
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        resolve(new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" }));
      }
    }, durationMs);
  });
}

type TeamsStatus = {
  configured: boolean;
  connected: boolean;
  accountEmail: string | null;
  accountName: string | null;
  redirectUri: string | null;
  error: string | null;
  ingestMode: string;
};

function teamsStatusLabel(status: TeamsStatus): string {
  if (!status.configured) return "not configured";
  if (status.connected) return "connected";
  return "ready to connect";
}

type TeamsMeeting = {
  id: string;
  joinUrl: string | null;
  subject: string | null;
};

export default function WorkflowReviewCallClient() {
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [channel, setChannel] = useState<"teams" | "zoom" | "meet" | "other">("teams");
  const [liveMode, setLiveMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [recorderSupported, setRecorderSupported] = useState<boolean | null>(null);
  const [question, setQuestion] = useState("");
  const [liveBuffer, setLiveBuffer] = useState("");
  const [interim, setInterim] = useState("");
  const [assist, setAssist] = useState<CallAssistAnswer | null>(null);
  const [analysis, setAnalysis] = useState<TranscriptAnalysis | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState<
    "assist" | "analyze" | "teams" | "recap" | "calendar" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [recap, setRecap] = useState<WorkflowReviewCallRecap | null>(null);
  const [recapSource, setRecapSource] = useState<"llm" | "rules" | null>(null);
  const [calendarNote, setCalendarNote] = useState<string | null>(null);
  const [micStatus, setMicStatus] = useState("Mic off");
  const [micLevel, setMicLevel] = useState(0);
  const [micDeviceId, setMicDeviceId] = useState("");
  const [micOptions, setMicOptions] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [teamsStatus, setTeamsStatus] = useState<TeamsStatus | null>(null);
  const [teamsStatusRefreshing, setTeamsStatusRefreshing] = useState(false);
  const [teamsStatusError, setTeamsStatusError] = useState<string | null>(null);
  const [teamsMeeting, setTeamsMeeting] = useState<TeamsMeeting | null>(null);
  const [teamsJoinUrlInput, setTeamsJoinUrlInput] = useState("");
  const [teamsNote, setTeamsNote] = useState<string | null>(null);
  const [teamsPolling, setTeamsPolling] = useState(false);
  const teamsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const teamsFullTextRef = useRef("");

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const wantListenRef = useRef(false);
  const liveBufferRef = useRef("");
  const analyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyzeInFlightRef = useRef(false);
  const levelRafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micLevelRef = useRef(0);
  const peakDuringChunkRef = useRef(0);
  const lastTranscriptRef = useRef("");
  const recapAnchorRef = useRef<HTMLElement | null>(null);
  const busyKindRef = useRef(busy);
  busyKindRef.current = busy;

  useEffect(() => {
    setRecorderSupported(
      typeof window !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof MediaRecorder !== "undefined",
    );
  }, []);

  useEffect(() => {
    liveBufferRef.current = liveBuffer;
  }, [liveBuffer]);

  useEffect(() => {
    if (!recap?.generatedAt) return;
    const id = window.setTimeout(() => {
      recapAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => clearTimeout(id);
  }, [recap?.generatedAt]);

  const refreshTeamsStatus = useCallback(async () => {
    setTeamsStatusRefreshing(true);
    setTeamsStatusError(null);
    // Drop status-echo notes; keep OAuth success notes only via ?teams=connected.
    setTeamsNote((prev) =>
      prev && prev.startsWith("Teams connected") ? prev : null,
    );
    try {
      const response = await fetch("/api/admin/operations-hub/teams/status", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const parsed = await parseJsonResponse<TeamsStatus & { ok?: boolean; error?: string; hint?: string }>(
        response,
      );
      if (!parsed.ok) {
        throw new Error(parsed.error);
      }
      if (!response.ok) {
        throw new Error(
          [parsed.data.error, parsed.data.hint].filter(Boolean).join(" ") || "Teams status failed.",
        );
      }
      const next: TeamsStatus = {
        configured: Boolean(parsed.data.configured),
        connected: Boolean(parsed.data.connected),
        accountEmail: parsed.data.accountEmail ?? null,
        accountName: parsed.data.accountName ?? null,
        redirectUri: parsed.data.redirectUri ?? null,
        error: parsed.data.error ?? null,
        ingestMode:
          parsed.data.ingestMode ||
          (parsed.data.configured ? "post_meeting_transcript" : "not_configured"),
      };
      setTeamsStatus(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Teams status failed.";
      setTeamsStatusError(message);
      setTeamsStatus((prev) =>
        prev ?? {
          configured: false,
          connected: false,
          accountEmail: null,
          accountName: null,
          redirectUri: null,
          error: message,
          ingestMode: "not_configured",
        },
      );
    } finally {
      setTeamsStatusRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshTeamsStatus();
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const teams = params.get("teams");
    if (teams === "connected") {
      setTeamsNote(
        `Teams connected${params.get("account") ? `: ${params.get("account")}` : ""}.`,
      );
      void refreshTeamsStatus();
    } else if (teams === "error") {
      setError(params.get("message") || "Teams OAuth failed.");
    }
  }, [refreshTeamsStatus]);

  useEffect(() => {
    return () => {
      if (teamsPollRef.current) clearInterval(teamsPollRef.current);
    };
  }, []);

  const runAnalyzeLive = useCallback(async (text: string) => {
    if (!text.trim() || analyzeInFlightRef.current) return;
    analyzeInFlightRef.current = true;
    // Never steal busy from recap/calendar/assist/teams — that made Generate
    // look idle while the recap request was still in flight.
    const canShowAnalyzeBusy =
      busyKindRef.current == null || busyKindRef.current === "analyze";
    if (canShowAnalyzeBusy) setBusy("analyze");
    try {
      const data = await fetchOpsPortalJson<{ analysis: TranscriptAnalysis }>(
        "/api/admin/operations-hub/workflow-review-call",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "analyze", transcript: text }),
        },
        "Live analysis failed.",
      );
      setAnalysis(data.analysis);
      setLastAnalyzedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Live analysis failed.");
    } finally {
      analyzeInFlightRef.current = false;
      setBusy((b) => (b === "analyze" ? null : b));
    }
  }, []);

  const scheduleLiveAnalyze = useCallback(
    (text: string) => {
      if (!wantListenRef.current && !liveMode && !teamsPolling) return;
      if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current);
      analyzeTimerRef.current = setTimeout(() => {
        void runAnalyzeLive(text);
      }, 1_500);
    },
    [liveMode, runAnalyzeLive, teamsPolling],
  );

  const createTeamsMeeting = async () => {
    setBusy("teams");
    setError(null);
    try {
      const subject = [company.trim() || "Prospect", "workflow review"]
        .filter(Boolean)
        .join(" · ");
      const data = await fetchOpsPortalJson<{ meeting: TeamsMeeting }>(
        "/api/admin/operations-hub/teams/meetings",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create", subject }),
        },
        "Create Teams meeting failed.",
      );
      setTeamsMeeting(data.meeting);
      if (data.meeting.joinUrl) setTeamsJoinUrlInput(data.meeting.joinUrl);
      setTeamsNote("Teams meeting created. Open the join link, enable transcription, host in Teams.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create Teams meeting failed.");
    } finally {
      setBusy(null);
    }
  };

  const linkTeamsMeeting = async () => {
    setBusy("teams");
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{ meeting: TeamsMeeting }>(
        "/api/admin/operations-hub/teams/meetings",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resolve", joinUrl: teamsJoinUrlInput }),
        },
        "Link Teams meeting failed.",
      );
      setTeamsMeeting(data.meeting);
      setTeamsNote("Meeting linked. Poll Graph after transcription finishes (post-meeting).");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Link Teams meeting failed.");
    } finally {
      setBusy(null);
    }
  };

  const pollTeamsTranscriptOnce = useCallback(async () => {
    if (!teamsMeeting?.id) return;
    try {
      const data = await fetchOpsPortalJson<{
        fullText: string;
        deltaText: string;
        ready: boolean;
        note: string;
      }>(
        "/api/admin/operations-hub/teams/transcript",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingId: teamsMeeting.id,
            previousText: teamsFullTextRef.current,
          }),
        },
        "Teams transcript poll failed.",
      );
      setTeamsNote(data.note);
      if (data.fullText) {
        teamsFullTextRef.current = data.fullText;
        setLiveBuffer(data.fullText);
        setLiveMode(true);
        scheduleLiveAnalyze(data.fullText);
      }
    } catch (err) {
      setTeamsNote(err instanceof Error ? err.message : "Teams transcript poll failed.");
    }
  }, [scheduleLiveAnalyze, teamsMeeting?.id]);

  const toggleTeamsPoll = () => {
    if (teamsPolling) {
      if (teamsPollRef.current) clearInterval(teamsPollRef.current);
      teamsPollRef.current = null;
      setTeamsPolling(false);
      setTeamsNote("Stopped Graph transcript polling.");
      return;
    }
    if (!teamsMeeting?.id) {
      setError("Create or link a Teams meeting first.");
      return;
    }
    setTeamsPolling(true);
    setLiveMode(true);
    setTeamsNote(
      "Polling Graph for transcripts every 20s (post-meeting artifact). Mic LIVE stays the in-call path.",
    );
    void pollTeamsTranscriptOnce();
    teamsPollRef.current = setInterval(() => {
      void pollTeamsTranscriptOnce();
    }, 20_000);
  };

  const appendTranscript = useCallback(
    (chunk: string) => {
      const cleaned = normalizeLiveTranscriptChunk(chunk);
      if (!cleaned || cleaned === "EMPTY") return;
      // Drop exact repeats from overlapping / hallucinated chunks.
      if (cleaned === lastTranscriptRef.current) return;
      if (
        lastTranscriptRef.current &&
        cleaned.includes(lastTranscriptRef.current) &&
        cleaned.length < lastTranscriptRef.current.length + 12
      ) {
        return;
      }
      lastTranscriptRef.current = cleaned;
      setLiveBuffer((prev) => {
        const next = `${prev}${prev ? " " : ""}${cleaned}`.trim();
        scheduleLiveAnalyze(next);
        return next;
      });
    },
    [scheduleLiveAnalyze],
  );

  const stopLevelMeter = useCallback(() => {
    if (levelRafRef.current != null) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
    try {
      void audioCtxRef.current?.close();
    } catch {
      /* ignore */
    }
    audioCtxRef.current = null;
    setMicLevel(0);
  }, []);

  const releaseMic = useCallback(() => {
    wantListenRef.current = false;
    stopLevelMeter();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setListening(false);
    setMicReady(false);
    setInterim("");
    setMicStatus("Mic off");
  }, [stopLevelMeter]);

  const startLevelMeter = useCallback(
    (stream: MediaStream) => {
      stopLevelMeter();
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i += 1) {
            const v = (data[i]! - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          const level = Math.min(100, Math.round(rms * 220));
          micLevelRef.current = level;
          if (level > peakDuringChunkRef.current) peakDuringChunkRef.current = level;
          setMicLevel(level);
          levelRafRef.current = requestAnimationFrame(tick);
        };
        levelRafRef.current = requestAnimationFrame(tick);
      } catch {
        /* level meter optional */
      }
    },
    [stopLevelMeter],
  );

  const runGeminiListenLoop = useCallback(
    async (stream: MediaStream) => {
      /** ~4s chunks: short clips mangled ordinals/vendor names ("25th"→"20 Fifth"). */
      const CHUNK_MS = 4_000;
      let inFlight = 0;
      const waiters: Array<() => void> = [];
      const acquire = async () => {
        if (inFlight < 2) {
          inFlight += 1;
          return;
        }
        await new Promise<void>((resolve) => waiters.push(resolve));
        inFlight += 1;
      };
      const release = () => {
        inFlight = Math.max(0, inFlight - 1);
        const next = waiters.shift();
        if (next) next();
      };

      const transcribeBlob = async (blob: Blob, peak: number) => {
        await acquire();
        try {
          if (!wantListenRef.current) return;
          setMicStatus(`Transcribing… (${inFlight} in flight)`);
          setInterim(`Transcribing ~${(CHUNK_MS / 1000).toFixed(1)}s (peak ${peak}%)…`);
          const audioBase64 = await blobToBase64(blob);
          const data = await fetchOpsPortalJson<{ transcript?: string }>(
            "/api/admin/operations-hub/worker-voice/transcribe",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioBase64,
                mimeType: blob.type || "audio/webm",
                context: "workflow-review",
              }),
            },
            "Live transcribe failed.",
          );
          const text = (data.transcript ?? "").trim();
          if (!text || text === "EMPTY") {
            setInterim("(no speech in last chunk)");
            return;
          }
          setInterim(text);
          appendTranscript(text);
        } catch (err) {
          if (wantListenRef.current) {
            setError(err instanceof Error ? err.message : "Live transcribe failed.");
            setMicStatus("Transcribe error — still listening");
          }
        } finally {
          release();
          if (wantListenRef.current) setMicStatus("Recording…");
        }
      };

      while (wantListenRef.current && mediaStreamRef.current === stream) {
        setMicStatus(inFlight > 0 ? `Recording… (${inFlight} transcribing)` : "Recording…");
        setListening(true);
        peakDuringChunkRef.current = 0;
        let blob: Blob;
        try {
          blob = await recordChunk(stream, CHUNK_MS);
        } catch (err) {
          if (!wantListenRef.current) break;
          setError(err instanceof Error ? err.message : "Mic record failed.");
          setMicStatus("Record failed");
          break;
        }
        if (!wantListenRef.current) break;
        const peak = peakDuringChunkRef.current;
        if (blob.size < 600 || peak < 3) {
          setInterim(`(quiet — peak ${peak}%)`);
          continue;
        }
        // Do not await — next record starts immediately.
        void transcribeBlob(blob, peak);
      }
      setListening(false);
    },
    [appendTranscript],
  );

  const startMicListen = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecorderSupported(false);
      setError("This browser cannot record audio. Use Chrome or Edge on desktop.");
      setMicStatus("Unsupported browser");
      return;
    }

    setError(null);
    setMicStatus("Requesting microphone…");
    releaseMic();
    wantListenRef.current = true;
    setLiveMode(true);

    try {
      const audioConstraint: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (micDeviceId) audioConstraint.deviceId = { exact: micDeviceId };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint });
      mediaStreamRef.current = stream;
      setMicReady(true);
      startLevelMeter(stream);

      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices
        .filter((d) => d.kind === "audioinput")
        .filter((d) => d.deviceId !== "default" && d.deviceId !== "communications")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${i + 1}`,
        }));
      setMicOptions(inputs);

      const label = stream.getAudioTracks()[0]?.label || "mic";
      setMicStatus(`LIVE via Gemini · ${label}`);
      setListening(true);
      void runGeminiListenLoop(stream);
    } catch (err) {
      wantListenRef.current = false;
      const name = err instanceof DOMException ? err.name : "Error";
      setError(
        name === "NotAllowedError"
          ? "Microphone blocked. Click the lock icon → allow Microphone, then Enable mic again."
          : "Could not open microphone. Check the mic is connected and not exclusive to another app.",
      );
      setMicStatus("Permission denied");
      setListening(false);
      setMicReady(false);
    }
  }, [micDeviceId, releaseMic, runGeminiListenLoop, startLevelMeter]);

  // Analyze periodically while live even if quiet.
  useEffect(() => {
    if (!liveMode) return;
    const id = setInterval(() => {
      const text = liveBufferRef.current;
      if (text.trim().length >= 24) void runAnalyzeLive(text);
    }, 6_000);
    return () => clearInterval(id);
  }, [liveMode, runAnalyzeLive]);

  useEffect(() => {
    return () => {
      wantListenRef.current = false;
      if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current);
      if (levelRafRef.current != null) cancelAnimationFrame(levelRafRef.current);
      try {
        void audioCtxRef.current?.close();
      } catch {
        /* ignore */
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const generateRecap = useCallback(async () => {
    const transcript = liveBufferRef.current.trim() || liveBuffer.trim();
    if (!transcript) {
      setError("Transcript buffer is empty — speak or paste before generating a recap.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setBusy("recap");
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{
        recap: WorkflowReviewCallRecap;
        recapSource?: "llm" | "rules";
      }>(
        "/api/admin/operations-hub/workflow-review-call",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "recap",
            transcript,
            company,
            contactName,
            channel,
          }),
        },
        "Call recap failed.",
      );
      setRecap(data.recap);
      setRecapSource(data.recapSource ?? "llm");
      persistWorkflowReviewRecap(data.recap);
      void runAnalyzeLive(transcript);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Call recap failed.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy((b) => (b === "recap" ? null : b));
    }
  }, [channel, company, contactName, liveBuffer, runAnalyzeLive]);

  const endLive = () => {
    releaseMic();
    setLiveMode(false);
    void generateRecap();
  };

  const pushRecapToCalendar = async () => {
    if (!recap || recap.actionItems.length === 0) {
      setError("Generate a call recap with action items first.");
      return;
    }
    setBusy("calendar");
    setError(null);
    setCalendarNote(null);
    try {
      const data = await fetchOpsPortalJson<{
        created: number;
        updated: number;
        message?: string;
      }>(
        "/api/admin/operations-hub/workflow-review-call",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "push-calendar", recap }),
        },
        "Calendar push failed.",
      );
      setCalendarNote(
        data.message ||
          `Pushed ${data.created} new / ${data.updated} updated — Ops Hub → Calendar.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calendar push failed.");
    } finally {
      setBusy(null);
    }
  };

  const runAssist = async () => {
    if (busy === "assist") return;
    setBusy("assist");
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{ assist: CallAssistAnswer }>(
        "/api/admin/operations-hub/workflow-review-call",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "assist", question }),
        },
        "Assist failed.",
      );
      setAssist(data.assist);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assist failed.");
    } finally {
      setBusy(null);
    }
  };

  const onBufferChange = (value: string) => {
    setLiveBuffer(value);
    scheduleLiveAnalyze(value);
  };

  return (
    <div className="min-h-screen bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="space-y-2 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap gap-3 text-xs">
            <Link href="/dashboard/operations" className="text-cyan-300 hover:underline">
              ← Operations hub
            </Link>
            <Link
              href="/dashboard/operations/library"
              className="text-cyan-300 hover:underline"
            >
              Operator library
            </Link>
            <Link
              href="/dashboard/operations/salesteam"
              className="text-cyan-300 hover:underline"
            >
              SalesTeam portal
            </Link>
            <a href="#talk-track" className="text-amber-300 hover:underline">
              Talk track
            </a>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
            Workflow review · LIVE desk · Design Partner
            <span className="text-slate-500"> · internal Path B</span>
          </p>
          <h1 className="text-2xl font-bold text-white">In-call sidecar</h1>
          <p className="max-w-3xl text-sm text-slate-400">
            One desk: talk track + mic STT + Pocket Q&A. Click{" "}
            <span className="text-emerald-300">Enable mic & go LIVE</span> (allow the browser prompt).
            Audio is transcribed in ~4s chunks via Gemini. Watch the green level bar — if it stays
            at 0 while you talk, pick another mic.
          </p>
        </header>

        {recorderSupported === false ? (
          <div className="rounded-xl border border-amber-900/50 bg-amber-950/30 p-3 text-sm text-amber-100">
            Microphone recording is unavailable in this browser. Use Chrome or Edge on desktop, or
            paste Teams live captions into the buffer.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="space-y-3 rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Microsoft Teams</h2>
              <p className="mt-1 max-w-3xl text-xs text-slate-400">
                Connect Graph to create/link meetings and pull the official transcript when Teams
                publishes it (usually after the call). In-call assist still uses{" "}
                <span className="text-emerald-300">mic LIVE</span> or pasted captions — Graph does
                not expose live captions.
              </p>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-indigo-300">
              {teamsStatusRefreshing
                ? "refreshing…"
                : teamsStatus == null
                  ? "checking…"
                  : teamsStatusLabel(teamsStatus)}
            </p>
          </div>

          {teamsStatus?.error && !teamsStatus.configured ? (
            <p className="text-xs text-amber-200">{teamsStatus.error}</p>
          ) : null}
          {teamsStatusError ? (
            <p className="text-xs text-amber-200">Status refresh failed: {teamsStatusError}</p>
          ) : null}
          {teamsStatus?.connected ? (
            <p className="text-xs text-slate-300">
              Signed in as{" "}
              <span className="text-indigo-200">
                {teamsStatus.accountName || teamsStatus.accountEmail || "Microsoft account"}
              </span>
            </p>
          ) : null}
          {teamsStatus?.redirectUri ? (
            <p className="font-mono text-[10px] text-slate-500">
              Redirect URI (paste in Azure): {teamsStatus.redirectUri}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {teamsStatus?.configured && !teamsStatus.connected ? (
              <button
                type="button"
                onClick={() => {
                  window.location.assign("/api/admin/operations-hub/teams/connect");
                }}
                className="rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-600"
              >
                Connect Microsoft Teams
              </button>
            ) : null}
            {teamsStatus?.connected ? (
              <>
                <button
                  type="button"
                  disabled={busy === "teams"}
                  onClick={() => void createTeamsMeeting()}
                  className="rounded-lg border border-indigo-600 px-3 py-2 text-xs font-medium text-indigo-100 hover:bg-indigo-950/50 disabled:opacity-40"
                >
                  {busy === "teams" ? "…" : "Create Teams meeting"}
                </button>
                <button
                  type="button"
                  disabled={!teamsMeeting?.id || busy === "teams"}
                  onClick={toggleTeamsPoll}
                  className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-900 disabled:opacity-40"
                >
                  {teamsPolling ? "Stop Graph poll" : "Poll Graph transcript"}
                </button>
              </>
            ) : null}
            <button
              type="button"
              disabled={teamsStatusRefreshing}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void refreshTeamsStatus();
              }}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900 disabled:opacity-40"
            >
              {teamsStatusRefreshing ? "Refreshing…" : "Refresh status"}
            </button>
          </div>

          {teamsStatus?.connected ? (
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                value={teamsJoinUrlInput}
                onChange={(e) => setTeamsJoinUrlInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100"
                placeholder="Paste existing Teams join URL to link…"
              />
              <button
                type="button"
                disabled={!teamsJoinUrlInput.trim() || busy === "teams"}
                onClick={() => void linkTeamsMeeting()}
                className="rounded-lg border border-indigo-700 px-3 py-2 text-xs text-indigo-100 hover:bg-indigo-950/40 disabled:opacity-40"
              >
                Link meeting
              </button>
            </div>
          ) : null}

          {teamsMeeting?.joinUrl ? (
            <p className="text-xs text-slate-300">
              Join:{" "}
              <a
                href={teamsMeeting.joinUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-cyan-300 hover:underline"
              >
                {teamsMeeting.joinUrl}
              </a>
            </p>
          ) : null}
          {teamsNote ? <p className="text-xs text-indigo-200/90">{teamsNote}</p> : null}
        </section>

        <section className="grid gap-3 rounded-xl border border-cyan-900/40 bg-slate-900/60 p-4 md:grid-cols-2 lg:grid-cols-5">
          <label className="block text-sm">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Company</span>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              placeholder="Western Alliance…"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Buyer</span>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              placeholder="Stephen McMaster"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Channel</span>
            <select
              value={channel}
              onChange={(e) =>
                setChannel(e.target.value as "teams" | "zoom" | "meet" | "other")
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            >
              <option value="teams">Microsoft Teams</option>
              <option value="zoom">Zoom</option>
              <option value="meet">Google Meet</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Microphone</span>
            <select
              value={micDeviceId}
              onChange={(e) => setMicDeviceId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            >
              <option value="">System default</option>
              {micOptions.map((m) => (
                <option key={m.deviceId} value={m.deviceId}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col justify-end gap-2">
            <p
              className={`font-mono text-[10px] uppercase tracking-widest ${
                listening ? "text-emerald-400" : micReady ? "text-cyan-300" : "text-slate-500"
              }`}
            >
              {micStatus}
              {busy === "analyze" ? " · analyzing" : ""}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded bg-slate-800">
              <div
                className="h-full bg-emerald-500 transition-[width] duration-75"
                style={{ width: `${micLevel}%` }}
              />
            </div>
            {!liveMode ? (
              <button
                type="button"
                onClick={() => void startMicListen()}
                className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Enable mic & go LIVE
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void startMicListen()}
                  className="rounded-lg border border-emerald-600 px-3 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-950/50"
                >
                  {listening ? "Re-arm mic" : "Start mic again"}
                </button>
                <button
                  type="button"
                  disabled={busy === "recap"}
                  onClick={endLive}
                  className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-40"
                >
                  {busy === "recap" ? "Recap…" : "End LIVE → recap"}
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="xl:sticky xl:top-4 xl:self-start">
            <WorkflowReviewTalkTrackPanel />
          </div>

          <section className="space-y-4">
            <div
              className={`rounded-xl border p-4 ${
                listening
                  ? "border-emerald-700/60 bg-emerald-950/20"
                  : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-white">Live transcript buffer</h2>
                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    listening ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {listening ? "● Gemini STT live" : "mic idle"}
                  {lastAnalyzedAt ? ` · ${lastAnalyzedAt}` : ""}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Chunks land about every ~4s (record continues while Gemini catches up). Level bar must
                move when you talk. For prospect audio, play Teams on speakers or paste captions.
              </p>
              <textarea
                value={liveBuffer}
                onChange={(e) => onBufferChange(e.target.value)}
                rows={14}
                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100"
                placeholder="When the mic is live, speech appears here…"
              />
              {interim ? (
                <p className="mt-2 font-mono text-xs text-emerald-300/80">Hearing: {interim}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!liveBuffer.trim()}
                  onClick={() => void runAnalyzeLive(liveBuffer)}
                  className="rounded-lg border border-amber-700 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-950/40 disabled:opacity-40"
                >
                  Refresh analysis now
                </button>
                <button
                  type="button"
                  disabled={busy === "recap"}
                  title={
                    !liveBuffer.trim()
                      ? "Paste or capture transcript first"
                      : busy === "recap"
                        ? "Generating recap…"
                        : "Generate call recap"
                  }
                  onClick={() => void generateRecap()}
                  className="rounded-lg border border-cyan-700 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-950/40 disabled:opacity-40"
                >
                  {busy === "recap" ? "Recap…" : "Generate call recap"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLiveBuffer("");
                    setAnalysis(null);
                    setRecap(null);
                    setRecapSource(null);
                    setInterim("");
                  }}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400"
                >
                  Clear buffer
                </button>
              </div>
              {busy === "recap" ? (
                <p className="mt-2 text-xs text-cyan-300">Generating call recap…</p>
              ) : recap ? (
                <p className="mt-2 text-xs text-cyan-300">
                  Recap ready —{" "}
                  <a href="#call-recap" className="underline hover:text-cyan-200">
                    jump to call recap
                  </a>
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/15 p-4">
              <h2 className="text-lg font-semibold text-emerald-100">Live Q&A (sidecar)</h2>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="They just asked: “Can we do a free PoC?”"
              />
              <button
                type="button"
                disabled={!question.trim() || busy === "assist"}
                onClick={() => void runAssist()}
                className="mt-2 rounded-lg border border-emerald-700 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-950/40 disabled:opacity-40"
              >
                {busy === "assist" ? "…" : "Pocket answer"}
              </button>
              {assist ? (
                <div className="mt-3 rounded-lg border border-emerald-900/40 bg-slate-950/50 p-3">
                  <p className="text-sm leading-relaxed text-slate-100">{assist.answer}</p>
                  {assist.banNote ? (
                    <p className="mt-2 text-xs text-amber-200/80">{assist.banNote}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-4">
            <div
              className={`rounded-xl border p-4 ${
                liveMode
                  ? "border-rose-700/50 bg-rose-950/20"
                  : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <h2 className="text-lg font-semibold text-white">Close readiness (live)</h2>
              {!analysis ? (
                <p className="mt-3 text-sm text-slate-500">
                  {listening
                    ? "Listening — speak or wait for first phrases…"
                    : "Enable mic to stream buying signs in real time."}
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-amber-300">
                    {analysis.closeReadiness.band} · {analysis.closeReadiness.score}/100
                  </p>
                  <p className="text-sm text-slate-100">{analysis.closeReadiness.summary}</p>
                  <p className="text-sm font-medium text-cyan-200">
                    Now: {analysis.closeReadiness.nextMove}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-4">
              <h2 className="text-lg font-semibold text-amber-100">Buying signs (live)</h2>
              {!analysis || analysis.buyingSignals.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">None yet — keep the conversation going.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {analysis.buyingSignals.map((signal) => (
                    <li
                      key={signal.id}
                      className="rounded-lg border border-amber-900/30 bg-slate-950/40 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-100">{signal.label}</span>
                        <span className="font-mono text-[10px] uppercase text-amber-300">
                          {signal.strength}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-cyan-200">{signal.closeHint}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {analysis && analysis.objections.length > 0 ? (
              <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-4">
                <h2 className="text-lg font-semibold text-rose-100">Objections (live)</h2>
                <ul className="mt-3 space-y-2">
                  {analysis.objections.map((row) => (
                    <li key={row.label} className="text-sm">
                      <div className="font-medium text-rose-100">{row.label}</div>
                      <p className="mt-1 text-xs text-slate-300">{row.suggestedReply}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        {recap ? (
          <section
            id="call-recap"
            ref={recapAnchorRef}
            className="space-y-4 rounded-xl border border-cyan-800/50 bg-cyan-950/20 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Call recap</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {recap.company}
                  {recap.contactName ? ` · ${recap.contactName}` : ""} · {recap.channel} ·{" "}
                  {recap.closeReadiness.band} ({recap.closeReadiness.score}/100)
                  {recapSource ? ` · ${recapSource === "llm" ? "LLM summary" : "rules fallback"}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === "calendar" || recap.actionItems.length === 0}
                  onClick={() => void pushRecapToCalendar()}
                  className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-600 disabled:opacity-40"
                >
                  {busy === "calendar" ? "Pushing…" : "Push to calendar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(recap.markdown);
                  }}
                  className="rounded-lg border border-cyan-700 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-950/40"
                >
                  Copy markdown
                </button>
                <Link
                  href="/dashboard/operations?tab=calendar"
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-900"
                >
                  Open calendar
                </Link>
              </div>
            </div>
            {calendarNote ? (
              <p className="text-xs text-emerald-300">{calendarNote}</p>
            ) : null}

            <WorkflowReviewPostYesStrip emphasis="recap" />

            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-cyan-300">
                Summary
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                {recap.summary.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-amber-300">
                Design Partner ask
              </h3>
              <p className="mt-1 text-[10px] text-slate-500">
                Say Command Design Partner · Internal code: Path B
              </p>
              <p className="mt-2 text-sm text-amber-50">{recap.pathBAsk}</p>
            </div>

            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-emerald-300">
                Action items
              </h3>
              <ul className="mt-2 space-y-2">
                {recap.actionItems.map((item) => (
                  <li
                    key={`${item.owner}-${item.text}`}
                    className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                      {item.owner} · {item.priority}
                    </span>
                    <p className="mt-1 text-slate-100">{item.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
