"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import {
  GET_STARTED_ORIENTATION_CUES,
  resolveOrientationCueIndex,
} from "@/app/lib/getStartedOrientationCues";

type Props = {
  audioSrc: string;
  /** When true, playback starts on mount (popup window). */
  autoStart?: boolean;
};

export default function OrientationWalkthroughPlayer({ audioSrc, autoStart = true }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeCueIndex, setActiveCueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [closeBlocked, setCloseBlocked] = useState(false);

  const activeCue = GET_STARTED_ORIENTATION_CUES[activeCueIndex] ?? GET_STARTED_ORIENTATION_CUES[0]!;

  const requestClose = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    setIsClosing(true);
    window.setTimeout(() => {
      window.close();
      if (!window.closed) {
        setCloseBlocked(true);
        setIsClosing(false);
        setIsPlaying(false);
      }
    }, 320);
  }, []);

  useEffect(() => {
    if (!autoStart) return;

    setActiveCueIndex(0);
    setIsClosing(false);
    setCloseBlocked(false);

    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    audio.load();

    void audio.play().then(
      () => setIsPlaying(true),
      () => setIsPlaying(false),
    );
  }, [autoStart, audioSrc]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextIndex = resolveOrientationCueIndex(GET_STARTED_ORIENTATION_CUES, audio.currentTime);
    setActiveCueIndex((prev) => (prev === nextIndex ? prev : nextIndex));
  };

  const handleEnded = () => {
    setIsPlaying(false);
    requestClose();
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().then(
        () => setIsPlaying(true),
        () => setIsPlaying(false),
      );
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div
      className={`ironframe-orientation-surface flex min-h-[100dvh] flex-col bg-[var(--bg-primary)] text-[var(--text-main)] transition-opacity duration-300 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--login-border)] px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-widest text-[var(--login-accent)] uppercase">
            IRONFRAME<span className="ml-1 text-[var(--login-muted)]">GRC</span>
            <span className="mx-2 text-[var(--login-border)]" aria-hidden>
              |
            </span>
            Command Post orientation
          </p>
          <h1 className="truncate text-sm font-semibold text-[var(--text-main)]">{activeCue.label}</h1>
        </div>
        <button
          type="button"
          onClick={requestClose}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--login-border)] text-[var(--login-muted)] transition hover:border-[var(--login-accent)] hover:text-[var(--text-main)]"
          aria-label="Close walkthrough window"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[var(--bg-secondary)]">
        {GET_STARTED_ORIENTATION_CUES.map((cue, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${cue.screenshotSrc}-${cue.startSeconds}`}
            src={cue.screenshotSrc}
            alt={cue.screenshotAlt}
            className={`absolute inset-0 h-full w-full object-contain object-top transition-all duration-700 ease-in-out ${
              index === activeCueIndex
                ? "scale-100 opacity-100"
                : "pointer-events-none scale-[1.02] opacity-0"
            }`}
            aria-hidden={index !== activeCueIndex}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--login-border)] px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={togglePlayback}
          className="inline-flex h-11 items-center rounded-lg border border-[var(--login-border)] bg-[var(--bg-secondary)] px-4 font-mono text-[10px] font-bold tracking-wide text-[var(--text-main)] uppercase transition hover:bg-[var(--bg-tertiary)]"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="auto"
          className="sr-only"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        <p className="text-[10px] text-[var(--login-muted)]">
          Cue {activeCueIndex + 1} of {GET_STARTED_ORIENTATION_CUES.length}
        </p>
        {closeBlocked ? (
          <p className="text-[10px] text-[var(--login-warning)]">
            Walkthrough complete — you may close this window.
          </p>
        ) : (
          <p className="text-[10px] text-[var(--login-muted)]">
            This window closes automatically when narration ends.
          </p>
        )}
      </div>
    </div>
  );
}
