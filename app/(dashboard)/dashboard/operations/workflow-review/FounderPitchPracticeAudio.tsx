"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  FOUNDER_PITCH_CASUAL,
  FOUNDER_PITCH_COMMERCIAL,
  type FounderPitchPracticeAssets,
  type FounderPitchRegister,
} from "./founderPitchPracticeAssets";

type PitchSentence = {
  index: number;
  text: string;
  src: string;
};

type PitchManifest = {
  version: number;
  sentences: PitchSentence[];
};

const linkClass =
  "rounded-lg border border-slate-700 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-slate-300 hover:border-slate-500 hover:text-white";

const transportBtnClass =
  "inline-flex items-center justify-center rounded-lg border border-cyan-600/60 bg-cyan-950/40 px-2.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-cyan-50 hover:bg-cyan-900/50 disabled:cursor-not-allowed disabled:opacity-40";

type Props = {
  register?: FounderPitchRegister;
  assets?: FounderPitchPracticeAssets;
  /** `header` = compact top-right control; `card` = full practice panel */
  variant?: "header" | "card";
};

function resolveAssets(props: Props): FounderPitchPracticeAssets {
  if (props.assets) return props.assets;
  return props.register === "casual" ? FOUNDER_PITCH_CASUAL : FOUNDER_PITCH_COMMERCIAL;
}

/**
 * Founder practice player — commercial or casual register.
 * Not for live prospect playback.
 */
export default function FounderPitchPracticeAudio(props: Props) {
  const { variant = "card" } = props;
  const assets = resolveAssets(props);

  const audioRef = useRef<HTMLAudioElement>(null);
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const swappingRef = useRef(false);
  const sentencesRef = useRef<PitchSentence[]>([]);

  const [sentences, setSentences] = useState<PitchSentence[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manifestReady, setManifestReady] = useState(false);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    sentencesRef.current = sentences;
  }, [sentences]);

  useEffect(() => {
    let cancelled = false;
    setManifestReady(false);
    setSentences([]);
    setIndex(0);
    indexRef.current = 0;
    void (async () => {
      try {
        const response = await fetch(assets.manifest, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Manifest HTTP ${response.status}`);
        }
        const data = (await response.json()) as PitchManifest;
        const list = Array.isArray(data.sentences) ? data.sentences : [];
        if (!list.length) {
          throw new Error("Sentence manifest is empty.");
        }
        if (cancelled) return;
        setSentences(list);
        setIndex(0);
        indexRef.current = 0;
        setManifestReady(true);
      } catch {
        if (cancelled) return;
        setError("Sentence cues unavailable. Play still works as a full track.");
        setManifestReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assets.manifest]);

  const loadSentence = useCallback(async (nextIndex: number, shouldPlay: boolean) => {
    const audio = audioRef.current;
    const list = sentencesRef.current;
    if (!audio || !list.length) return;

    const clamped = Math.max(0, Math.min(list.length - 1, nextIndex));
    const cue = list[clamped];
    setError(null);
    setIndex(clamped);
    indexRef.current = clamped;

    swappingRef.current = true;
    audio.src = cue.src;
    audio.load();

    if (!shouldPlay) {
      swappingRef.current = false;
      setPlaying(false);
      playingRef.current = false;
      return;
    }

    try {
      await audio.play();
      setPlaying(true);
      playingRef.current = true;
    } catch {
      setPlaying(false);
      playingRef.current = false;
      setError("Could not play audio. Confirm sentence MP3s are under /training-audio/.");
    } finally {
      swappingRef.current = false;
    }
  }, []);

  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);

    if (!audio.paused) {
      audio.pause();
      setPlaying(false);
      playingRef.current = false;
      return;
    }

    const list = sentencesRef.current;
    if (list.length) {
      const currentSrc = audio.currentSrc || audio.src;
      const expected = list[indexRef.current]?.src;
      if (!currentSrc || !expected || !currentSrc.includes(expected.split("/").pop() || "")) {
        await loadSentence(indexRef.current, true);
        return;
      }
      try {
        await audio.play();
        setPlaying(true);
        playingRef.current = true;
      } catch {
        setPlaying(false);
        playingRef.current = false;
        setError("Could not play audio. Confirm the MP3 is deployed under /training-audio/.");
      }
      return;
    }

    try {
      audio.src = assets.audioFull;
      audio.load();
      await audio.play();
      setPlaying(true);
      playingRef.current = true;
    } catch {
      setPlaying(false);
      playingRef.current = false;
      setError("Could not play audio. Confirm the MP3 is deployed under /training-audio/.");
    }
  }, [assets.audioFull, loadSentence]);

  const goPrevSentence = useCallback(() => {
    if (!sentencesRef.current.length) return;
    void loadSentence(Math.max(0, indexRef.current - 1), true);
  }, [loadSentence]);

  const goNextSentence = useCallback(() => {
    if (!sentencesRef.current.length) return;
    void loadSentence(Math.min(sentencesRef.current.length - 1, indexRef.current + 1), true);
  }, [loadSentence]);

  const onEnded = useCallback(() => {
    const list = sentencesRef.current;
    if (!list.length) {
      setPlaying(false);
      playingRef.current = false;
      return;
    }
    const current = indexRef.current;
    if (current < list.length - 1) {
      void loadSentence(current + 1, true);
      return;
    }
    setPlaying(false);
    playingRef.current = false;
  }, [loadSentence]);

  const currentText = sentences[index]?.text ?? null;
  const sentenceNavEnabled = sentences.length > 0;

  const transport = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={goPrevSentence}
        disabled={!sentenceNavEnabled || index <= 0}
        className={transportBtnClass}
        title="Previous sentence"
        aria-label="Previous sentence"
      >
        ⟨⟨
      </button>
      <button
        type="button"
        onClick={() => void toggle()}
        className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/70 bg-cyan-950/60 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,0.15)] hover:bg-cyan-900/60"
        title="Practice only — do not play on a live prospect call"
      >
        <span aria-hidden>{playing ? "❚❚" : "▶"}</span>
        {playing ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        onClick={goNextSentence}
        disabled={!sentenceNavEnabled || index >= sentences.length - 1}
        className={transportBtnClass}
        title="Next sentence"
        aria-label="Next sentence"
      >
        ⟩⟩
      </button>
      {sentenceNavEnabled ? (
        <span className="font-mono text-[10px] uppercase tracking-wide text-slate-400">
          Sentence {index + 1}/{sentences.length}
        </span>
      ) : null}
    </div>
  );

  const scriptLinks = (
    <>
      <a href={assets.scriptTxt} download={assets.downloadScriptName} className={linkClass}>
        Download script
      </a>
      <a
        href={`${assets.scriptPrint}?print=1`}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        title="Opens a print-ready page"
      >
        Print script
      </a>
      <a href={assets.audioFull} download={assets.downloadMp3Name} className={linkClass}>
        Download MP3
      </a>
      <Link href={assets.sisterPageHref} className={linkClass}>
        {assets.sisterPageLabel}
      </Link>
    </>
  );

  const audioEl = (
    <audio
      ref={audioRef}
      preload="none"
      onEnded={onEnded}
      onPause={() => {
        if (swappingRef.current) return;
        setPlaying(false);
        playingRef.current = false;
      }}
      onPlay={() => {
        setPlaying(true);
        playingRef.current = true;
      }}
      className="sr-only"
    />
  );

  if (variant === "header") {
    return (
      <div className="flex max-w-xl shrink-0 flex-col items-end gap-1.5">
        {transport}
        <div className="flex flex-wrap items-center justify-end gap-2">{scriptLinks}</div>
        {currentText ? (
          <p className="max-w-md text-right text-[11px] leading-snug text-slate-400" title={currentText}>
            {currentText.length > 140 ? `${currentText.slice(0, 137)}…` : currentText}
          </p>
        ) : null}
        {error ? <p className="max-w-xs text-right text-[10px] text-rose-300">{error}</p> : null}
        {!manifestReady && !error ? (
          <p className="font-mono text-[9px] uppercase tracking-wide text-slate-600">Loading cues…</p>
        ) : null}
        {audioEl}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-cyan-800/50 bg-cyan-950/20 p-3">
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-300">
        {assets.title}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">
        {assets.subtitle} Practice for you —{" "}
        <strong className="text-white">do not play on a live prospect call</strong>. Use ⟨⟨ / ⟩⟩ to
        step one sentence at a time.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {transport}
        <div className="flex flex-wrap items-center gap-2">{scriptLinks}</div>
        {currentText ? (
          <p className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1.5 text-xs leading-relaxed text-slate-200">
            {currentText}
          </p>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
      {audioEl}
    </div>
  );
}
