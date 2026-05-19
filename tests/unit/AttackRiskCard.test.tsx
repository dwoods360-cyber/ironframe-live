import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AttackRiskCard from "@/app/components/AttackRiskCard";

describe("AttackRiskCard", () => {
  it("renders attack fields and red-team chrome", () => {
    render(
      <AttackRiskCard
        processedData={{
          attackVector: "Ransomware: EHR encryption",
          targetAsset: "Healthcare",
          agentId: "KIMBOT",
          payloadDetails: "Simulated encryption on healthcare records.",
        }}
        phase="PROCESSING"
        isActive
      />,
    );

    expect(screen.getByTestId("attack-risk-card")).toHaveAttribute("data-attack-phase", "PROCESSING");
    expect(screen.getByText("Ransomware: EHR encryption")).toBeTruthy();
    expect(screen.getByText(/Healthcare/)).toBeTruthy();
    expect(screen.getByText("KIMBOT")).toBeTruthy();
    expect(screen.getByText(/Simulated encryption/)).toBeTruthy();
  });
});
