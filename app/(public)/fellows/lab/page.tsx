"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import FellowsNav from "../FellowsNav";
import {
  fellowsMissionLesson,
  isFellowsLessonCheckCorrect,
} from "@/app/lib/fellows/missionLessons";
import {
  FELLOWS_LAB_CLIENT_A,
  FELLOWS_LAB_CLIENT_B,
} from "@/config/fellowsPortal";

type MeResponse = {
  fellowId: string;
  fullName: string;
  tenantEnclaveId: string;
  academicTrack?: string;
  sandboxExpiresAt?: string | null;
  completionBadgeHash?: string | null;
  progress: {
    passedCount: number;
    totalMissions: number;
    rubricUnlocked: boolean;
    rubricSubmitted: boolean;
  };
  missions: Array<{ missionNumber: number; status: string }>;
};

function trackLabHint(track: string | undefined): string {
  switch (track) {
    case "MSCSIA_CAPSTONE":
      return "MSCSIA capstone track — same missions; document assumptions, lineage, and boundary proof for appendices.";
    case "MSCSIA_COURSEWORK":
      return "MSCSIA coursework track — same missions; capture methodology notes as you go.";
    case "BS_CYBERSECURITY":
      return "Cybersecurity BS track — same missions; export for portfolio or course evidence.";
    case "ALUMNI_PRACTITIONER":
      return "Practitioner track — same missions; optional friction notes for the lab.";
    default:
      return "Same core missions for every academic track.";
  }
}

function missionPassed(me: MeResponse | null, n: number): boolean {
  return me?.missions.some((m) => m.missionNumber === n && m.status === "PASSED") ?? false;
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

const FRICTION_OPTIONS = [
  "Float vs whole-cent math unclear at work",
  "Shared-stack tenancy / soft tags",
  "Untrusted ingest promoted too early",
  "Export lineage gaps for auditors",
  "Board packs still color-only",
] as const;

export default function FellowsLabPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needApply, setNeedApply] = useState(false);
  const [activeMission, setActiveMission] = useState<1 | 2 | 3 | 4>(1);

  const [sleMin, setSleMin] = useState(250_000_00);
  const [sleMax, setSleMax] = useState(1_200_000_00);
  const [aroMinMilli, setAroMinMilli] = useState(250);
  const [aroMaxMilli, setAroMaxMilli] = useState(1000);

  const [exportFormat, setExportFormat] = useState<"JSON" | "CSV">("JSON");
  const [lastExport, setLastExport] = useState<{
    fileName: string;
    content: string;
    mimeType: string;
    hash: string;
  } | null>(null);

  const [qScore, setQScore] = useState(4);
  const [lScore, setLScore] = useState(4);
  const [iScore, setIScore] = useState(4);
  const [vScore, setVScore] = useState(4);
  const [mathNotes, setMathNotes] = useState("");
  const [academicUse, setAcademicUse] = useState("");
  const [friction, setFriction] = useState<string[]>([]);
  const [requestBriefing, setRequestBriefing] = useState(false);
  const [lessonCleared, setLessonCleared] = useState<Record<1 | 2 | 3 | 4, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
  });
  const [selectedCheck, setSelectedCheck] = useState<string | null>(null);
  const [checkFeedback, setCheckFeedback] = useState<string | null>(null);

  const pushLog = (line: string) => setLog((prev) => [...prev, line]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("fellows_lesson_cleared");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<1 | 2 | 3 | 4, boolean>>;
      setLessonCleared((prev) => ({
        1: Boolean(parsed[1]),
        2: Boolean(parsed[2]),
        3: Boolean(parsed[3]),
        4: Boolean(parsed[4]),
      }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setSelectedCheck(null);
    setCheckFeedback(null);
  }, [activeMission]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/fellows/me", { credentials: "include" });
    if (res.status === 401) {
      setNeedApply(true);
      setMe(null);
      return;
    }
    if (!res.ok) {
      setError("Unable to load fellow session");
      return;
    }
    setNeedApply(false);
    setMe(await res.json());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submitTelemetry = async (missionNumber: 1 | 2 | 3 | 4, receiptToken: string) => {
    const tel = await fetch("/api/fellows/missions/telemetry", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missionNumber, receiptToken }),
    });
    const telJson = await tel.json();
    if (!tel.ok) {
      throw new Error(telJson.error || "Telemetry failed");
    }
    pushLog(
      `[PASSED] Mission ${missionNumber} — progress ${telJson.progress.passedCount}/${telJson.progress.totalMissions}`,
    );
    await refresh();
    return telJson as {
      progress: { passedCount: number; totalMissions: number; rubricUnlocked: boolean };
    };
  };

  const runMission1 = async () => {
    setBusy(true);
    setError(null);
    pushLog(`[RUN] Exposure stress-test (whole-cent BIGINT)…`);
    try {
      const res = await fetch("/api/fellows/sandbox/exposure-stress", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sleMinCents: sleMin,
          sleMaxCents: sleMax,
          aroMinMilli,
          aroMaxMilli,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.receiptToken) {
        setError(json.error || "Exposure stress-test failed");
        pushLog(`[FAIL] ${json.error || res.status}`);
        return;
      }
      pushLog(
        `[MATH] estimated exposure ${json.result.estimatedExposureMinCents}–${json.result.estimatedExposureMaxCents} cents`,
      );
      pushLog(`[AUDIT] Receipt ${String(json.receiptToken).slice(0, 12)}… issued`);
      await submitTelemetry(1, json.receiptToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  };

  const runMission2 = async () => {
    setBusy(true);
    setError(null);
    pushLog(`[RUN] Promote unverified vendor questionnaire → executive pack…`);
    try {
      const res = await fetch("/api/fellows/sandbox/untrusted-ingest", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "promote_to_executive_pack",
          artifactId: "vendor-q-unverified-001",
        }),
      });
      const json = await res.json();
      if (res.status !== 422 || !json.receiptToken || !json.quarantineBlocked) {
        setError(json.error || "Expected quarantine block + receipt");
        pushLog(`[FAIL] Unexpected status ${res.status}`);
        return;
      }
      pushLog(`[GATE] ${json.quarantineReason}`);
      pushLog(`[AUDIT] Receipt ${String(json.receiptToken).slice(0, 12)}… issued`);
      await submitTelemetry(2, json.receiptToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  };

  const runMission3 = async () => {
    setBusy(true);
    setError(null);
    pushLog(`[RUN] Session context ${FELLOWS_LAB_CLIENT_A} → probe ${FELLOWS_LAB_CLIENT_B}…`);
    try {
      const probe = await fetch("/api/fellows/sandbox/cross-tenant-probe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceTenantId: FELLOWS_LAB_CLIENT_A,
          targetTenantId: FELLOWS_LAB_CLIENT_B,
        }),
      });
      const probeJson = await probe.json();
      if (probe.status !== 403 || !probeJson.receiptToken) {
        setError(probeJson.error || "Expected 403 + server receipt");
        pushLog(`[FAIL] Unexpected probe status ${probe.status}`);
        return;
      }
      pushLog(`[GATE] ${probeJson.error}`);
      pushLog(`[AUDIT] Receipt ${String(probeJson.receiptToken).slice(0, 12)}… issued`);
      await submitTelemetry(3, probeJson.receiptToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  };

  const runMission4 = async () => {
    setBusy(true);
    setError(null);
    pushLog(`[RUN] Lineage export (${exportFormat}) + SHA-256…`);
    try {
      const res = await fetch("/api/fellows/sandbox/lineage-export", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: exportFormat }),
      });
      const json = await res.json();
      if (!res.ok || !json.receiptToken || !json.package) {
        setError(json.error || "Lineage export failed");
        pushLog(`[FAIL] ${json.error || res.status}`);
        return;
      }
      setLastExport({
        fileName: json.package.fileName,
        content: json.package.content,
        mimeType: json.package.mimeType,
        hash: json.package.exportPackageHash,
      });
      pushLog(`[HASH] sha256:${String(json.package.exportPackageHash).slice(0, 16)}…`);
      pushLog(`[AUDIT] Receipt ${String(json.receiptToken).slice(0, 12)}… issued`);
      downloadTextFile(json.package.fileName, json.package.content, json.package.mimeType);
      await submitTelemetry(4, json.receiptToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  };

  const submitRubric = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/fellows/rubric", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantitativeScore: qScore,
          lineageScore: lScore,
          isolationScore: iScore,
          velocityScore: vScore,
          mathFrictionNotes: mathNotes,
          academicUseDescription: academicUse,
          workplaceFrictionJson: friction,
          requestBriefing,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Rubric submit failed");
        return;
      }
      pushLog(`[DONE] Rubric submitted · completion hash ${String(json.completionBadgeHash).slice(0, 12)}…`);
      await refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  };

  if (needApply) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <FellowsNav />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold text-white">Fellow session required</h1>
          <p className="mt-3 text-sm text-slate-400">
            Request sandbox access on the fellowship landing page first.
          </p>
          <Link
            href="/fellows"
            className="mt-6 inline-flex rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
          >
            Request access
          </Link>
        </div>
      </div>
    );
  }

  const missionMeta: Record<
    1 | 2 | 3 | 4,
    { title: string; blurb: string; run: () => void; cta: string }
  > = {
    1: {
      title: "Mission 1: Exposure stress-test",
      blurb:
        "Adjust SLE bounds and ARO (milli) — server computes estimated exposure in whole cents (BIGINT). Pass requires a server receipt.",
      run: () => void runMission1(),
      cta: busy ? "Computing…" : "Run whole-cent stress-test",
    },
    2: {
      title: "Mission 2: Untrusted ingest gate",
      blurb:
        "Attempt to promote an unverified synthetic vendor questionnaire into an executive pack. Pass = quarantine block + receipt.",
      run: () => void runMission2(),
      cta: busy ? "Probing ingest…" : "Attempt promote (expect quarantine)",
    },
    3: {
      title: "Mission 3: Multi-Tenant Boundary Isolation",
      blurb:
        "Runs a real cross-enclave probe. Pass requires a server-issued receipt — not a client-mocked 403.",
      run: () => void runMission3(),
      cta: busy ? "Testing boundary…" : "Execute boundary audit",
    },
    4: {
      title: "Mission 4: Lineage export",
      blurb:
        "Export the lab audit register with collector, timestamp, scope hash, and operator sign-off. SHA-256 is server-issued.",
      run: () => void runMission4(),
      cta: busy ? "Exporting…" : `Export ${exportFormat} + mark PASS`,
    },
  };

  const meta = missionMeta[activeMission];
  const lesson = fellowsMissionLesson(activeMission);
  const lessonUnlocked = lessonCleared[activeMission];

  const submitLessonCheck = () => {
    if (!selectedCheck) {
      setCheckFeedback("Select an answer to continue.");
      return;
    }
    if (!isFellowsLessonCheckCorrect(activeMission, selectedCheck)) {
      setCheckFeedback("Not quite — re-read the lesson and try again.");
      return;
    }
    setCheckFeedback(lesson.check.explainCorrect);
    setLessonCleared((prev) => {
      const next = { ...prev, [activeMission]: true };
      try {
        sessionStorage.setItem("fellows_lesson_cleared", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    pushLog(`[LESSON ${lesson.code}] Check passed — lab run unlocked`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <FellowsNav />
      <main className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
        <p className="font-mono text-[10px] tracking-[0.12em] text-teal-500">
          IRONFRAMEGRC // FELLOWS
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Lab console</h1>
        {me && (
          <>
            <p className="mt-2 text-sm text-slate-400">
              {me.fullName} · enclave{" "}
              <span className="font-mono text-slate-300">{me.tenantEnclaveId}</span> · passed{" "}
              {me.progress.passedCount}/{me.progress.totalMissions}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              {trackLabHint(me.academicTrack)}
            </p>
          </>
        )}

        <div className="mt-6 grid grid-cols-4 gap-2">
          {([1, 2, 3, 4] as const).map((n) => {
            const passed = missionPassed(me, n);
            const active = activeMission === n;
            const cleared = lessonCleared[n];
            return (
              <button
                key={n}
                type="button"
                onClick={() => setActiveMission(n)}
                className={`rounded-md border px-2 py-2 text-left text-[10px] font-mono transition-colors ${
                  active
                    ? "border-cyan-500/60 bg-cyan-950/40 text-cyan-300"
                    : passed
                      ? "border-teal-900/50 bg-teal-950/20 text-teal-500"
                      : "border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700"
                }`}
              >
                M{n}
                {passed ? " · PASS" : cleared ? " · LESSON" : ""}
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl border border-teal-900/40 bg-slate-950/80 p-5">
          <p className="font-mono text-[10px] font-bold tracking-widest text-teal-500">
            LESSON {lesson.code} · TEACH → CHECK → LAB
          </p>
          <h2 className="mt-1 text-sm font-semibold text-white">{lesson.title}</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{lesson.labAction}</p>

          <p className="mt-4 font-mono text-[10px] font-bold tracking-widest text-slate-500">
            YOU WILL LEARN
          </p>
          <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-400">
            {lesson.youWillLearn.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="shrink-0 text-teal-500">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 font-mono text-[10px] font-bold tracking-widest text-slate-500">
            TEACH
          </p>
          <div className="mt-2 space-y-3 text-xs leading-relaxed text-slate-400">
            {lesson.teach.map((para) => (
              <p key={para.slice(0, 48)}>{para}</p>
            ))}
          </div>

          <p className="mt-4 font-mono text-[10px] font-bold tracking-widest text-slate-500">
            CHECK
          </p>
          <p className="mt-2 text-xs font-medium text-slate-300">{lesson.check.prompt}</p>
          <div className="mt-3 space-y-2">
            {lesson.check.options.map((opt) => {
              const selected = selectedCheck === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={lessonUnlocked}
                  onClick={() => setSelectedCheck(opt.id)}
                  className={`block w-full rounded-md border px-3 py-2 text-left text-xs leading-relaxed transition-colors ${
                    selected
                      ? "border-teal-500/60 bg-teal-950/30 text-teal-100"
                      : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                  } disabled:opacity-70`}
                >
                  <span className="font-mono text-teal-500">{opt.id.toUpperCase()}.</span>{" "}
                  {opt.label}
                </button>
              );
            })}
          </div>

          {!lessonUnlocked ? (
            <button
              type="button"
              onClick={submitLessonCheck}
              className="mt-4 rounded-md bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500"
            >
              Submit check · unlock lab
            </button>
          ) : (
            <p className="mt-4 text-xs text-teal-400">Lesson check passed — lab run unlocked.</p>
          )}

          {checkFeedback && (
            <p
              className={`mt-3 text-xs leading-relaxed ${
                lessonUnlocked ? "text-teal-300/90" : "text-amber-300/90"
              }`}
            >
              {checkFeedback}
            </p>
          )}

          <p className="mt-4 text-xs leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-400">Write-up prompt: </span>
            {lesson.writeUpPrompt}
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5 font-mono text-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-cyan-400">{meta.title}</h2>
            <span className="text-[10px] text-slate-500">
              {lessonUnlocked ? "SERVER RECEIPT" : "LOCKED · COMPLETE LESSON"}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{meta.blurb}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            <span className="text-slate-400">PASS proves: </span>
            {lesson.youProve}
          </p>

          {activeMission === 1 && (
            <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
              <label className="space-y-1">
                <span>SLE min (cents)</span>
                <input
                  type="number"
                  className="w-full rounded border border-slate-800 bg-black/40 px-2 py-1.5 text-slate-200"
                  value={sleMin}
                  onChange={(e) => setSleMin(Number(e.target.value))}
                />
              </label>
              <label className="space-y-1">
                <span>SLE max (cents)</span>
                <input
                  type="number"
                  className="w-full rounded border border-slate-800 bg-black/40 px-2 py-1.5 text-slate-200"
                  value={sleMax}
                  onChange={(e) => setSleMax(Number(e.target.value))}
                />
              </label>
              <label className="space-y-1">
                <span>ARO min (milli; 1000 = 1/yr)</span>
                <input
                  type="number"
                  className="w-full rounded border border-slate-800 bg-black/40 px-2 py-1.5 text-slate-200"
                  value={aroMinMilli}
                  onChange={(e) => setAroMinMilli(Number(e.target.value))}
                />
              </label>
              <label className="space-y-1">
                <span>ARO max (milli)</span>
                <input
                  type="number"
                  className="w-full rounded border border-slate-800 bg-black/40 px-2 py-1.5 text-slate-200"
                  value={aroMaxMilli}
                  onChange={(e) => setAroMaxMilli(Number(e.target.value))}
                />
              </label>
            </div>
          )}

          {activeMission === 4 && (
            <div className="mt-4 flex gap-3 text-xs">
              {(["JSON", "CSV"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setExportFormat(fmt)}
                  className={`rounded border px-3 py-1.5 ${
                    exportFormat === fmt
                      ? "border-cyan-600 text-cyan-300"
                      : "border-slate-800 text-slate-500"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 h-40 overflow-y-auto rounded border border-slate-900 bg-black/50 p-3 text-xs text-slate-300">
            {log.length === 0 ? (
              <span className="text-slate-600">Ready — select a mission and execute…</span>
            ) : (
              log.map((line, i) => (
                <div key={`${i}-${line.slice(0, 12)}`}>{line}</div>
              ))
            )}
          </div>

          {error && (
            <p className="mt-3 rounded border border-rose-900 bg-rose-950/30 px-2 py-1.5 text-xs text-rose-300">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={busy || !me || !lessonUnlocked}
            onClick={meta.run}
            className="mt-4 rounded-md bg-cyan-600 px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-400"
          >
            {!lessonUnlocked
              ? "Complete lesson check to unlock"
              : meta.cta}
          </button>

          {lastExport && (
            <button
              type="button"
              className="ml-3 mt-4 rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
              onClick={() =>
                downloadTextFile(lastExport.fileName, lastExport.content, lastExport.mimeType)
              }
            >
              Re-download export
            </button>
          )}
        </div>

        {me?.progress.rubricUnlocked && (
          <div className="mt-8 rounded-xl border border-teal-900/40 bg-teal-950/10 p-5">
            <h2 className="font-mono text-xs font-bold tracking-widest text-teal-400">
              CAPSTONE / LEARNING RUBRIC
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Short feedback after all four missions. Issues a lab completion hash — not a
              certification.
            </p>

            {me.progress.rubricSubmitted ? (
              <p className="mt-4 text-sm text-teal-300">
                Rubric submitted
                {me.completionBadgeHash
                  ? ` · hash ${me.completionBadgeHash.slice(0, 16)}…`
                  : ""}
              </p>
            ) : (
              <div className="mt-4 space-y-3 text-xs text-slate-400">
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["Quantitative clarity", qScore, setQScore],
                      ["Lineage usefulness", lScore, setLScore],
                      ["Isolation proof", iScore, setIScore],
                      ["Lab velocity", vScore, setVScore],
                    ] as const
                  ).map(([label, val, set]) => (
                    <label key={label} className="space-y-1">
                      <span>
                        {label} ({val}/5)
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={val}
                        onChange={(e) => set(Number(e.target.value))}
                        className="w-full"
                      />
                    </label>
                  ))}
                </div>
                <label className="block space-y-1">
                  <span>Math / friction notes (min 10 chars)</span>
                  <textarea
                    className="min-h-[72px] w-full rounded border border-slate-800 bg-black/40 px-2 py-1.5 text-slate-200"
                    value={mathNotes}
                    onChange={(e) => setMathNotes(e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <span>How you&apos;ll use this academically</span>
                  <textarea
                    className="min-h-[72px] w-full rounded border border-slate-800 bg-black/40 px-2 py-1.5 text-slate-200"
                    value={academicUse}
                    onChange={(e) => setAcademicUse(e.target.value)}
                  />
                </label>
                <div className="space-y-1">
                  <span>Workplace friction (optional)</span>
                  <div className="flex flex-wrap gap-2">
                    {FRICTION_OPTIONS.map((opt) => {
                      const on = friction.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setFriction((prev) =>
                              on ? prev.filter((x) => x !== opt) : [...prev, opt],
                            )
                          }
                          className={`rounded border px-2 py-1 ${
                            on
                              ? "border-teal-600 text-teal-300"
                              : "border-slate-800 text-slate-500"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="flex items-start gap-2 text-slate-500">
                  <input
                    type="checkbox"
                    checked={requestBriefing}
                    onChange={(e) => setRequestBriefing(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Optional: send me a short architecture brief later (ops flag only — not a sales
                    pitch in this lab).
                  </span>
                </label>
                <button
                  type="button"
                  disabled={busy || mathNotes.trim().length < 10 || academicUse.trim().length < 10}
                  onClick={() => void submitRubric()}
                  className="rounded-md bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  Submit rubric
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
