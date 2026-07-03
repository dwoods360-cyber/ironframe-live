import { describe, expect, it } from "vitest";

import { useTrainerAgentDrawerStore } from "@/app/store/trainerAgentDrawerStore";

describe("trainerAgentDrawerStore", () => {
  it("opens and closes the global Trainer drawer", () => {
    useTrainerAgentDrawerStore.setState({ isOpen: false });
    useTrainerAgentDrawerStore.getState().open();
    expect(useTrainerAgentDrawerStore.getState().isOpen).toBe(true);
    useTrainerAgentDrawerStore.getState().close();
    expect(useTrainerAgentDrawerStore.getState().isOpen).toBe(false);
  });
});
