import { describe, expect, it } from "vitest";
import {
  floatingNotifyTopClass,
  layoutContentShellClass,
} from "./layoutConstants";

describe("layoutConstants", () => {
  it("reserves 9rem for the three-row fixed header stack", () => {
    expect(layoutContentShellClass(false).paddingTop).toBe("pt-[9rem]");
    expect(layoutContentShellClass(false).height).toBe("h-[100dvh] box-border");
  });

  it("adds airlock height in simulation mode", () => {
    expect(layoutContentShellClass(true).paddingTop).toBe("pt-[11.25rem]");
  });

  it("places tier-1 notices below Header #2", () => {
    expect(floatingNotifyTopClass(false, 1)).toBe("top-[9.5rem]");
    expect(floatingNotifyTopClass(true, 1)).toBe("top-[11.75rem]");
  });
});
