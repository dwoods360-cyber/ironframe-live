import type { GetStartedStepId } from "@/app/lib/getStartedSteps";
import {
  GET_STARTED_COMMAND_POST_SCREENSHOT,
  GET_STARTED_EXPORT_SCREENSHOT,
} from "@/app/lib/getStartedTrainingAssets";

/** Screenshot-backed guided cues — maps to Level 1 training capture assets. */
export const GET_STARTED_STEP_VISUALS: Record<
  GetStartedStepId,
  { screenshotSrc: string; screenshotAlt: string; actionCue: string }
> = {
  quickstart: {
    screenshotSrc: GET_STARTED_COMMAND_POST_SCREENSHOT,
    screenshotAlt:
      "Command Post dashboard navigation — tripane layout, TopNav command paths, and primary control areas",
    actionCue:
      "Click Open orientation guide for the Command Post screenshot and control-area map, then mark complete.",
  },
  "integrity-hub": {
    screenshotSrc: "/docs/training/assets/level-1-04-integrity-hub-ale.png",
    screenshotAlt: "Integrity Hub with tenant ALE baselines",
    actionCue:
      "Click Open Integrity Hub guide for the Level 1 screenshot and lab copy. Mark complete when oriented — live /integrity unlocks after billing confirmation.",
  },
  "level1-index": {
    screenshotSrc: "/docs/training/assets/level-1-09-docs-hub-handbook.png",
    screenshotAlt: "Documentation hub and Level 1 training index",
    actionCue:
      "Click Open Level 1 index. Skim the chapter list — you can finish labs later. Mark complete when oriented.",
  },
  "trainer-session": {
    screenshotSrc: "/docs/training/assets/level-1-06-cockpit-agent-viewport.png",
    screenshotAlt: "Agent workforce cockpit viewport",
    actionCue:
      "Click Ask Trainer in Header #1, or scroll to the Trainer panel below. Mark complete after a grounded lesson.",
  },
  "export-path": {
    screenshotSrc: GET_STARTED_EXPORT_SCREENSHOT,
    screenshotAlt: "Audit trail reports and tenant-scoped forensic export actions",
    actionCue:
      "Click Open export guide for the export console walkthrough. Mark complete when oriented — live exports unlock after billing confirmation.",
  },
};
