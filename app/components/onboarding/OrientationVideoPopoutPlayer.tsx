"use client";

type Props = {
  src: string;
};

export default function OrientationVideoPopoutPlayer({ src }: Props) {
  return (
    <div className="ironframe-orientation-surface flex min-h-[100dvh] flex-col bg-[var(--bg-primary)] p-4 text-[var(--text-main)] sm:p-6">
      <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-[var(--login-accent)]">
        IRONFRAME<span className="ml-1 text-[var(--login-muted)]">GRC</span>
        <span className="mx-2 text-[var(--login-border)]" aria-hidden>
          |
        </span>
        Command Post orientation
      </p>
      <video
        controls
        autoPlay
        preload="metadata"
        src={src}
        className="mx-auto w-full max-w-4xl rounded-lg border border-[var(--login-border)] bg-[var(--bg-secondary)]"
        aria-label="Orientation video walkthrough"
        onEnded={() => {
          window.setTimeout(() => {
            window.close();
          }, 400);
        }}
      />
      <p className="mx-auto mt-4 max-w-4xl text-xs text-[var(--login-muted)]">
        This window closes when playback ends. If it stays open, close it manually.
      </p>
    </div>
  );
}
