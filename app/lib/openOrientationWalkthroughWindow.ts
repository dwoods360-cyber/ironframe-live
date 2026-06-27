export const ORIENTATION_WALKTHROUGH_PATH = "/get-started/orientation";

export const ORIENTATION_WALKTHROUGH_WINDOW_NAME = "ironframe-orientation-walkthrough";

/** Opens the synced screenshot walkthrough in a dedicated browser window. */
export function openOrientationWalkthroughWindow(): Window | null {
  if (typeof window === "undefined") return null;

  const features = [
    "width=960",
    "height=720",
    "menubar=no",
    "toolbar=no",
    "location=no",
    "status=no",
    "scrollbars=no",
    "resizable=yes",
  ].join(",");

  const popup = window.open(
    ORIENTATION_WALKTHROUGH_PATH,
    ORIENTATION_WALKTHROUGH_WINDOW_NAME,
    features,
  );
  popup?.focus();
  return popup;
}
