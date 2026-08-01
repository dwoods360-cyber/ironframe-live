import { describe, expect, it } from "vitest";
import {
  formatIronleadsDealNotes,
  formatQualificationSignalsDisplay,
} from "@/app/lib/ironleadsOperatorDisplay";

describe("ironleadsOperatorDisplay", () => {
  it("renders deal notes in plain language", () => {
    const lines = formatIronleadsDealNotes(
      [
        "Ironleads ingress (deduped) | trigger=REG_FINE,NEW_CISO,BOARD_MANDATE_DOLLAR_RISK | priorScore=63",
        "Buying-committee research 2026-08-01T17:44:31.636Z: members=CISO,CEO,CFO; pages=7",
      ].join("\n"),
    );
    expect(lines[0]).toContain("deduped");
    expect(lines[0]).toContain("Regulatory fine");
    expect(lines[0]).toContain("63");
    expect(lines[1]).toContain("Buying-committee research");
    expect(lines[1]).toContain("CISO, CEO, CFO");
    expect(lines[1]).toContain("7 public page");
  });

  it("renders qualification signals without raw JSON", () => {
    const display = formatQualificationSignalsDisplay({
      triggers: ["REG_FINE", "NEW_CISO", "BOARD_MANDATE_DOLLAR_RISK"],
      painScore: 0.25,
      computedAt: "2026-08-01T16:13:39.270Z",
      painMarkers: { fragmentedGrc: true },
      triggerScore: 1,
      beachheadScore: 1,
      priorityWeight: 0.625,
      methodologyScore: 0,
    });
    expect(display?.summary).toContain("Regulatory fine");
    expect(display?.rows.find((r) => r.label === "Trigger strength")?.value).toContain("100%");
    expect(display?.rows.find((r) => r.label === "Pain signal weight")?.value).toContain(
      "fragmented GRC",
    );
  });
});
