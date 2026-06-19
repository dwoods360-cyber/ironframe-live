import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildTrainerCorpusWhere,
  synthesizeTrainerSession,
  TRAINER_CORPUS_READING_LEVELS,
} from "@/app/lib/server/trainerAgentConsoleCore";
import prisma from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  default: {
    appDocument: {
      findMany: vi.fn(),
    },
    agentLog: {
      create: vi.fn(),
    },
  },
}));

const mockGenerateContent = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    text: "## Lab 1\n\n1. Open `/integrity`.\n\n**Quick tip:** Use tenant-scoped session.\n",
  }),
);

vi.mock("@google/genai", () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
    };
  },
}));

describe("trainerAgentConsoleCore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_API_KEY = "mock_test_key";
    vi.mocked(prisma.appDocument.findMany).mockResolvedValue([
      {
        slug: "training/level-1/04-integrity-hub-ale",
        title: "Integrity Hub & ALE",
        content: "Navigate to /integrity to review BigInt cent baselines.",
      },
    ] as never);
    vi.mocked(prisma.agentLog.create).mockResolvedValue({} as never);
  });

  it("buildTrainerCorpusWhere scopes to training and user-manuals only", () => {
    expect(buildTrainerCorpusWhere()).toEqual({
      readingLevel: { in: [...TRAINER_CORPUS_READING_LEVELS] },
      OR: [{ slug: { startsWith: "training/" } }, { slug: { startsWith: "user-manuals/" } }],
    });
  });

  it("synthesizes a grounded lesson and writes a TRAINER_SESSION audit log", async () => {
    const result = await synthesizeTrainerSession({
      tenantId: "tenant-abc",
      topic: "Integrity Hub ALE",
      message: "Need a short lab for new students.",
    });

    expect(result.lesson).toContain("Lab 1");
    expect(result.sourceSlugs).toContain("training/level-1/04-integrity-hub-ale");
    expect(result.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    expect(prisma.appDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: buildTrainerCorpusWhere(),
      }),
    );

    expect(prisma.agentLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-abc",
          message: expect.stringContaining("TRAINER_SESSION"),
        }),
      }),
    );

    const generateCall = mockGenerateContent.mock.calls[0]?.[0] as {
      config?: { systemInstruction?: string; temperature?: number };
    };
    expect(generateCall.config?.temperature).toBe(0.0);
    expect(generateCall.config?.systemInstruction).toContain("11th-grade");
  });
});
