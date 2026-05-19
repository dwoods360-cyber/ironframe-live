import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RedTeamAttackCard from "@/app/components/RedTeamAttackCard";

describe("RedTeamAttackCard", () => {
  it("renders sanitizedData only (no fetch)", () => {
    render(
      <RedTeamAttackCard
        sanitizedData={{
          id: "atk-1",
          timestamp: "2026-05-16T12:00:00.000Z",
          vector: "API Breach: credential stuffing",
          payload: "Simulated credential stuffing on health API.",
          severity: "high",
        }}
        isActive
        stackIndex={0}
      />,
    );

    const card = screen.getByTestId("red-team-attack-card");
    expect(card).toHaveAttribute("data-attack-id", "atk-1");
    expect(card).toHaveAttribute("data-attack-severity", "high");
    expect(card).toHaveAttribute("data-attack-active", "true");
    expect(screen.getByText("API Breach: credential stuffing")).toBeTruthy();
    expect(screen.getByText("Simulated credential stuffing on health API.")).toBeTruthy();
  });
});
