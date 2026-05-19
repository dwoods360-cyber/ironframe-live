import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RiskCard from "@/app/components/RiskCard";

describe("RiskCard lifecycle pattern states", () => {
  it("INGESTED shows sensing skeleton at 50% opacity", () => {
    render(
      <RiskCard
        processedData={{
          title: "Probe",
          value: "$1.6B",
          delta: "Sensing…",
          status: "INGESTED",
        }}
      />,
    );
    const card = screen.getByTestId("risk-card");
    expect(card).toHaveAttribute("data-risk-status", "INGESTED");
    expect(card).toHaveClass("opacity-50");
    expect(screen.getByText("Sensing…")).toBeTruthy();
  });

  it("REGISTERED is full opacity baseline logged", () => {
    render(
      <RiskCard
        processedData={{
          title: "Baseline",
          value: "$2.0B",
          delta: "Baseline Logged",
          status: "REGISTERED",
        }}
      />,
    );
    const card = screen.getByTestId("risk-card");
    expect(screen.getByText("Baseline Logged")).toBeTruthy();
    expect(card).toHaveClass("opacity-100");
    expect(card).not.toHaveClass("animate-pulse");
  });

  it("ACTIVE pulses with attack glow", () => {
    render(
      <RiskCard
        processedData={{
          title: "Attack live",
          value: "$1.6B",
          delta: "Impacting maturity",
          status: "ACTIVE",
        }}
      />,
    );
    const card = screen.getByTestId("risk-card");
    expect(card).toHaveClass("border-red-500");
    expect(card).toHaveClass("animate-pulse");
  });

  it("shows framework, governed liability, and system integrity badge", () => {
    render(
      <RiskCard
        processedData={{
          title: "System Integrity Drill — KIMBOT",
          value: "$1.60M",
          delta: "Exposure",
          status: "PROCESSING",
          frameworkLabel: "SOC 2",
          governedLiability: "$820,000.00",
          systemIntegrityDrill: "KIMBOT",
        }}
      />,
    );
    expect(screen.getByTestId("risk-card-integrity-badge")).toHaveTextContent("KIMBOT");
    expect(screen.getByText("Framework")).toBeTruthy();
    expect(screen.getByText("SOC 2")).toBeTruthy();
    expect(screen.getByText("Governed liability")).toBeTruthy();
    expect(screen.getByText("$820,000.00")).toBeTruthy();
  });

  it("RESOLVED shows checkmark and forensic closure", () => {
    render(
      <RiskCard
        processedData={{
          title: "Closed",
          value: "$0",
          delta: "done",
          status: "RESOLVED",
        }}
      />,
    );
    const card = screen.getByTestId("risk-card");
    expect(screen.getByText("Forensic Closure")).toBeTruthy();
    expect(card).toHaveClass("opacity-70");
  });
});
