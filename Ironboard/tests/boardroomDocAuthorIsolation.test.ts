import { describe, expect, it } from "vitest";

import {
  AGENTIC_BOARD_ROSTER,
  BOARDROOM_ISOLATED_AGENT_IDS,
  BOARDROOM_ISOLATED_AGENT_REDIRECTS,
  BOARDROOM_QUERY_ROSTER,
  buildBoardroomRosterDisplayEntries,
} from "../src/staticContext.js";

describe("boardroom documentation author isolation", () => {
  it("renders all 17 personas in the boardroom roster display", () => {
    const display = buildBoardroomRosterDisplayEntries();
    expect(display).toHaveLength(17);
    expect(display.filter((entry) => entry.isolated)).toHaveLength(2);
    expect(display.some((entry) => entry.id === "board-writer" && entry.isolated)).toBe(true);
    expect(display.some((entry) => entry.id === "board-trainer" && entry.isolated)).toBe(true);
  });

  it("excludes board-trainer and board-writer from the live query roster", () => {
    expect(BOARDROOM_ISOLATED_AGENT_IDS.has("board-trainer")).toBe(true);
    expect(BOARDROOM_ISOLATED_AGENT_IDS.has("board-writer")).toBe(true);
    expect(BOARDROOM_QUERY_ROSTER.some((persona) => persona.id === "board-trainer")).toBe(false);
    expect(BOARDROOM_QUERY_ROSTER.some((persona) => persona.id === "board-writer")).toBe(false);
    expect(BOARDROOM_QUERY_ROSTER.length).toBe(AGENTIC_BOARD_ROSTER.length - 2);
  });

  it("maps isolated personas to Ironframe agent routes", () => {
    expect(BOARDROOM_ISOLATED_AGENT_REDIRECTS["board-trainer"]).toBe("/api/agents/trainer");
    expect(BOARDROOM_ISOLATED_AGENT_REDIRECTS["board-writer"]).toBe("/api/agents/writer");
  });

  it("retains both authors on the full persona registry for documentation pipeline authoring", () => {
    expect(AGENTIC_BOARD_ROSTER.some((persona) => persona.id === "board-trainer")).toBe(true);
    expect(AGENTIC_BOARD_ROSTER.some((persona) => persona.id === "board-writer")).toBe(true);
  });
});
