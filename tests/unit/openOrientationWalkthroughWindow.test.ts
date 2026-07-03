import { describe, expect, it, vi } from "vitest";

import {
  ORIENTATION_WALKTHROUGH_PATH,
  ORIENTATION_WALKTHROUGH_WINDOW_NAME,
  openOrientationWalkthroughWindow,
} from "@/app/lib/openOrientationWalkthroughWindow";

describe("openOrientationWalkthroughWindow", () => {
  it("opens the orientation route in a named popup", () => {
    const openSpy = vi.fn().mockReturnValue({ focus: vi.fn() });
    vi.stubGlobal("window", { open: openSpy, focus: vi.fn() });

    openOrientationWalkthroughWindow();

    expect(openSpy).toHaveBeenCalledWith(
      ORIENTATION_WALKTHROUGH_PATH,
      ORIENTATION_WALKTHROUGH_WINDOW_NAME,
      expect.stringContaining("width=960"),
    );
  });
});
