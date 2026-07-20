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
    startSeconds: 28,
    label: "Command Post layout",
    screenshotSrc: GET_STARTED_COMMAND_POST_SCREENSHOT,
    screenshotAlt: "Command Post tripane layout with primary control-area callouts",
  },
  {
    startSeconds: 65,
    label: "Get Started checklist",
    screenshotSrc: "/docs/training/assets/level-1-02-auth-tenant-access.png",
    screenshotAlt: "Workspace access and Get Started portal context",
  },
  {
    startSeconds: 90,
    label: "Primary control areas",
    screenshotSrc: "/docs/training/assets/level-1-05-evidence-vault.png",
    screenshotAlt: "Evidence Locker and compliance document surfaces",
  },
  {
    startSeconds: 125,
    label: "Workspace orientation",
    screenshotSrc: GET_STARTED_COMMAND_POST_SCREENSHOT,
    screenshotAlt: "Design Partner Operator Packet orientation map",
  },
  {
    startSeconds: 155,
    label: "Integrity Hub and ALE baselines",
    screenshotSrc: "/docs/training/assets/level-1-04-integrity-hub-ale.png",
    screenshotAlt: "Integrity Hub with tenant ALE baselines",
  },
  {
    startSeconds: 185,
    label: "Partner training track",
    screenshotSrc: "/docs/training/assets/level-1-09-docs-hub-handbook.png",
    screenshotAlt: "Curated partner training index in Documentation",
  },
  {
    startSeconds: 215,
    label: "Trainer agent sandbox",
    screenshotSrc: "/docs/training/assets/level-1-06-cockpit-agent-viewport.png",
    screenshotAlt: "Agent workforce cockpit viewport",
  },
  {
    startSeconds: 235,
    label: "Audit export path",
    screenshotSrc: GET_STARTED_EXPORT_SCREENSHOT,
    screenshotAlt: "Exports console — tenant-scoped CSV and PDF actions",
  },
  {
    startSeconds: 260,
    label: "Next steps",
    screenshotSrc: "/docs/training/assets/level-1-09-docs-hub-handbook.png",
    screenshotAlt: "Documentation hub for Design Partner Operator Packet",
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
