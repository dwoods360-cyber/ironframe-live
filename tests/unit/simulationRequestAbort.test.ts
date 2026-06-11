import { describe, expect, it } from "vitest";
import {
  SimulationRequestAbortError,
  isSimulationRequestAbortError,
  prismaAbortOptions,
  throwIfAborted,
} from "@/app/lib/server/simulationRequestAbort";

describe("simulationRequestAbort", () => {
  it("throws when signal is aborted", () => {
    const controller = new AbortController();
    controller.abort("simulation-nav-switch");
    expect(() => throwIfAborted(controller.signal)).toThrow(SimulationRequestAbortError);
  });

  it("recognizes AbortError as simulation abort", () => {
    const err = new DOMException("signal is aborted without reason", "AbortError");
    expect(isSimulationRequestAbortError(err)).toBe(true);
  });

  it("does not treat Prisma abortSignal validation errors as simulation abort", () => {
    const err = new Error(
      "Invalid `prisma.company.findMany()` invocation: abortSignal: {} could not serialize",
    );
    expect(isSimulationRequestAbortError(err)).toBe(false);
  });

  it("skips non-native abort signals for Prisma", () => {
    const fake = { aborted: false } as AbortSignal;
    expect(prismaAbortOptions(fake)).toEqual({});
  });

  it("does not pass abortSignal into Prisma (Next.js request.signal is incompatible)", () => {
    const controller = new AbortController();
    expect(prismaAbortOptions(controller.signal)).toEqual({});
  });
});
