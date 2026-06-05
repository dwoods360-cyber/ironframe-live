import { describe, expect, it } from "vitest";
import {
  buildSimulationDispatchMessage,
  resolveSimulationCardProduced,
} from "@/app/utils/simulationDispatchOutcome";

describe("simulationDispatchOutcome", () => {
  it("marks L1–L3 autonomous drills as non-card-producing", () => {
    expect(resolveSimulationCardProduced("INTERNAL")).toBe(false);
    expect(resolveSimulationCardProduced("HOME_SERVER")).toBe(false);
    expect(resolveSimulationCardProduced("CLOUD_EXFIL")).toBe(false);
  });

  it("marks L4/L5 and adversary drills as card-producing", () => {
    expect(resolveSimulationCardProduced("REMOTE_SUPPORT")).toBe(true);
    expect(resolveSimulationCardProduced("REMOTE_SUPPORT", { deferRemoteSupportDrill: true })).toBe(
      true,
    );
    expect(resolveSimulationCardProduced("CASCADING_FAILURE")).toBe(true);
    expect(resolveSimulationCardProduced("INFIL_CRED_STUFFING")).toBe(true);
    expect(resolveSimulationCardProduced("PHISH_CEO_FRAUD")).toBe(true);
  });

  it("builds auditor-facing dispatch copy", () => {
    const msg = buildSimulationDispatchMessage(
      "6 — IRONTECH CHAOS L6 · CRYPTOGRAPHIC RANSOMWARE (EXTORTION)",
      "[Ironcast] SYSTEM SECURITY WARNING: RANSOMWARE THREAT CONTAINED.",
    );
    expect(msg).toContain("SIMULATION DISPATCH CONFIRMED");
    expect(msg).toContain("No manual card required");
    expect(msg).toContain("RANSOMWARE THREAT CONTAINED");
  });
});
