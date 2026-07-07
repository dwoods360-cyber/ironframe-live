/** Git-tracked Level 1/2 capture corpus under `public/docs/training/assets/`. */
export const TRAINING_SCREENSHOT_BASE = "/docs/training/assets";

/** Bump when training screenshot bytes or paths change. */
export const GET_STARTED_TRAINING_ASSET_VERSION = "1";

export function withGetStartedTrainingScreenshot(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  const sep = trimmed.includes("?") ? "&" : "?";
  return `${trimmed}${sep}v=${GET_STARTED_TRAINING_ASSET_VERSION}`;
}

/** Command Post / dashboard navigation — primary route `/` (chapter 3). */
export const GET_STARTED_COMMAND_POST_SCREENSHOT = withGetStartedTrainingScreenshot(
  `${TRAINING_SCREENSHOT_BASE}/level-1-03-dashboard-navigation.png`,
);

/** Audit trail / export path — `/reports/audit-trail` (level 2 chapter 5). */
export const GET_STARTED_EXPORT_SCREENSHOT = withGetStartedTrainingScreenshot(
  `${TRAINING_SCREENSHOT_BASE}/level-2-05-audit-trail-exports.png`,
);

/** Legacy filenames kept on disk for older bundles — same bytes as corpus captures above. */
export const GET_STARTED_COMMAND_POST_SCREENSHOT_LEGACY = withGetStartedTrainingScreenshot(
  `${TRAINING_SCREENSHOT_BASE}/get-started-command-post-orientation.png`,
);

export const GET_STARTED_EXPORT_SCREENSHOT_LEGACY = withGetStartedTrainingScreenshot(
  `${TRAINING_SCREENSHOT_BASE}/get-started-dashboard-exports-stack.png`,
);
