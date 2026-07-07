/**
 * Screenshot cues for the full orientation overview MP3.
 * Timestamps align with `docs/user-manuals/get-started-orientation-audio-script.md` — tune after re-synthesis.
 */
import {
  GET_STARTED_COMMAND_POST_SCREENSHOT,
  GET_STARTED_EXPORT_SCREENSHOT,
} from "@/app/lib/getStartedTrainingAssets";
export type OrientationAudioCue = {
  startSeconds: number;
  label: string;
  screenshotSrc: string;
  screenshotAlt: string;
};

export const GET_STARTED_ORIENTATION_CUES: OrientationAudioCue[] = [
  {
    startSeconds: 0,
    label: "Welcome",
    screenshotSrc: GET_STARTED_COMMAND_POST_SCREENSHOT,
    screenshotAlt:
      "Command Post dashboard navigation with tripane layout and TopNav command paths",
  },
  {
    startSeconds: 20,
    label: "Command Post layout",
    screenshotSrc: GET_STARTED_COMMAND_POST_SCREENSHOT,
    screenshotAlt: "Command Post tripane layout with primary control-area callouts",
  },
  {
    startSeconds: 55,
    label: "Get Started checklist",
    screenshotSrc: "/docs/training/assets/level-1-02-auth-tenant-access.png",
    screenshotAlt: "Workspace access and tenant assignment context",
  },
  {
    startSeconds: 75,
    label: "Primary control areas",
    screenshotSrc: "/docs/training/assets/level-1-05-evidence-vault.png",
    screenshotAlt: "Evidence Locker and compliance document surfaces",
  },
  {
    startSeconds: 110,
    label: "Command Post orientation",
    screenshotSrc: GET_STARTED_COMMAND_POST_SCREENSHOT,
    screenshotAlt: "Command Post orientation map with numbered primary control areas",
  },
  {
    startSeconds: 140,
    label: "Integrity Hub and ALE baselines",
    screenshotSrc: "/docs/training/assets/level-1-04-integrity-hub-ale.png",
    screenshotAlt: "Integrity Hub with tenant ALE baselines",
  },
  {
    startSeconds: 160,
    label: "Level 1 training track",
    screenshotSrc: "/docs/training/assets/level-1-09-docs-hub-handbook.png",
    screenshotAlt: "Documentation hub and Level 1 training index",
  },
  {
    startSeconds: 180,
    label: "Trainer agent sandbox",
    screenshotSrc: "/docs/training/assets/level-1-06-cockpit-agent-viewport.png",
    screenshotAlt: "Agent workforce cockpit viewport",
  },
  {
    startSeconds: 200,
    label: "Audit export path",
    screenshotSrc: GET_STARTED_EXPORT_SCREENSHOT,
    screenshotAlt: "Audit trail reports and tenant-scoped forensic export actions",
  },
  {
    startSeconds: 225,
    label: "Next steps",
    screenshotSrc: "/docs/training/assets/level-1-09-docs-hub-handbook.png",
    screenshotAlt: "Documentation hub for extended onboarding",
  },
];

/** Index of the cue active at `currentTime` (seconds). */
export function resolveOrientationCueIndex(
  cues: OrientationAudioCue[],
  currentTime: number,
): number {
  if (cues.length === 0) return 0;
  let active = 0;
  for (let i = 0; i < cues.length; i++) {
    if (currentTime >= cues[i]!.startSeconds) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}
