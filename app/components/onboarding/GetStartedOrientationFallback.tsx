import { GET_STARTED_STEPS } from "@/app/lib/getStartedSteps";
import { GET_STARTED_STEP_VISUALS } from "@/app/lib/getStartedStepVisuals";

export const GET_STARTED_QUICKSTART_GUIDE_HREF =
  "/docs/user-manuals/design-partner-operator-packet";

export const GET_STARTED_ORIENTATION_HASH = "orientation-guide";

type Props = {
  mode: "loading" | "unavailable" | "companion";
  detail?: string | null;
};

/** Bucket B orientation when the inline quickstart reader cannot load (billing, scope, or seed gap). */
export default function GetStartedOrientationFallback({ mode, detail }: Props) {
  const step = GET_STARTED_STEPS.find((row) => row.id === "quickstart")!;
  const visual = GET_STARTED_STEP_VISUALS.quickstart;

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--login-accent)]">
          Command Post orientation
        </p>
        <h2 className="mt-2 font-sans text-2xl font-bold text-[var(--text-main)]">{step.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--login-muted)]">{step.description}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--login-border)] bg-[#050a14]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={visual.screenshotSrc}
          alt={visual.screenshotAlt}
          className="max-h-64 w-full object-cover object-top"
        />
      </div>
      <p className="text-[11px] leading-relaxed text-[var(--login-muted)]">{visual.actionCue}</p>

      <div className="rounded-xl border border-[var(--login-border)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--login-muted)]">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wide text-[var(--login-accent)]">
          Primary control areas
        </h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <strong className="text-[var(--text-main)]">Integrity Hub</strong> — financial risk scores
            and protection baselines
          </li>
          <li>
            <strong className="text-[var(--text-main)]">Workforce Cockpit</strong> — automated safety
            sweeps and agent activity trails
          </li>
          <li>
            <strong className="text-[var(--text-main)]">Evidence Locker</strong> — WORM-locked compliance
            documents
          </li>
          <li>
            <strong className="text-[var(--text-main)]">Documentation</strong> — in-app manuals and Level
            1 training tracks
          </li>
          <li>
            <strong className="text-[var(--text-main)]">Settings</strong> — tenant configuration and
            contacts
          </li>
        </ul>
      </div>

      {mode === "loading" ? (
        <p className="font-mono text-xs text-[var(--login-muted)]">Loading full orientation guide…</p>
      ) : null}

      {mode === "unavailable" ? (
        <p className="rounded-lg border border-[var(--login-warning)]/30 bg-[color-mix(in_srgb,var(--login-warning)_8%,transparent)] p-3 text-xs leading-relaxed text-[var(--text-main)]">
          The full written guide could not be loaded
          {detail ? ` (${detail})` : ""}. Use the Command Post screenshot and checklist on this page to
          complete orientation. Billing activation unlocks live Command Post surfaces after Get Started.
        </p>
      ) : null}

      {mode === "companion" ? (
        <p className="font-mono text-[10px] leading-relaxed text-[var(--login-muted)]">
          Invite and credential steps were handled in your activation email. Open full docs in a new tab
          only if you need the extended markdown guide.
        </p>
      ) : null}
    </article>
  );
}
