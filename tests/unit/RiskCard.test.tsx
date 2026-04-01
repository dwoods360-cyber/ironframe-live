import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RiskCard from "@/app/components/RiskCard";

describe("RiskCard (Epic 6 — border telemetry only)", () => {
  it("ASSIGNED uses steady cyan border", () => {
    render(
      <RiskCard
        status="ASSIGNED"
        risk={{ title: "Supply chain exposure", ale_impact: 1_000_000n }}
      />,
    );

    const card = screen.getByTestId("risk-card");
    expect(card).toHaveClass("border-cyan-400");
    expect(card).not.toHaveClass("animate-pulse");
    expect(card.getAttribute("data-risk-status")).toBe("ASSIGNED");
  });

  it("PROCESSING uses amber border and pulse", () => {
    render(
      <RiskCard status="PROCESSING" risk={{ title: "Active review", ale_impact: 500n }} />,
    );

    const card = screen.getByTestId("risk-card");
    expect(card).toHaveClass("border-amber-500");
    expect(card).toHaveClass("animate-pulse");
  });

  it("VERIFIED uses steady emerald border", () => {
    render(
      <RiskCard status="VERIFIED" risk={{ title: "Closed loop", ale_impact: 0n }} />,
    );

    const card = screen.getByTestId("risk-card");
    expect(card).toHaveClass("border-emerald-500");
    expect(card).not.toHaveClass("animate-pulse");
  });

  it("formats ale_impact from BigInt cents without float conversion", () => {
    render(
      <RiskCard status="ASSIGNED" risk={{ title: "ALE", ale_impact: 999n }} />,
    );

    expect(screen.getByText(/\$9\.99/)).toBeTruthy();
  });
});
