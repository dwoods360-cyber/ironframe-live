import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildWriterCorpusWhere,
  synthesizeWriterSession,
  WRITER_CORPUS_READING_LEVELS,
} from "@/app/lib/server/writerAgentConsoleCore";
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
    text: "## Architecture\n\n- Ironframe :3000 vs IronBoard :8082\n\nsource-file: docs/technical/architecture-and-api.md",
  }),
);

vi.mock("@google/genai", () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
    };
  },
}));

describe("writerAgentConsoleCore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_API_KEY = "mock_test_key";
    vi.mocked(prisma.appDocument.findMany).mockResolvedValue([
      {
        slug: "technical/architecture-and-api",
        title: "Architecture and API",
        content: "Dual-host topology: Ironframe :3000 and IronBoard :8082.",
      },
    ] as never);
    vi.mocked(prisma.agentLog.create).mockResolvedValue({} as never);
  });

  it("buildWriterCorpusWhere scopes to technical and level-2 training only", () => {
    expect(buildWriterCorpusWhere()).toEqual({
      readingLevel: { in: [...WRITER_CORPUS_READING_LEVELS] },
      OR: [{ slug: { startsWith: "technical/" } }, { slug: { startsWith: "training/level-2/" } }],
    });
  });

  it("synthesizes a grounded practitioner brief and writes a WRITER_SESSION audit log", async () => {
    const result = await synthesizeWriterSession({
      tenantId: "tenant-abc",
      topic: "Dual-host architecture",
      message: "Need API ingress summary.",
    });

    expect(result.brief).toContain("Architecture");
    expect(result.sourceSlugs).toContain("technical/architecture-and-api");
    expect(result.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    expect(prisma.appDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: buildWriterCorpusWhere(),
      }),
    );

    expect(prisma.agentLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-abc",
          message: expect.stringContaining("WRITER_SESSION"),
        }),
      }),
    );

    const generateCall = mockGenerateContent.mock.calls[0]?.[0] as {
      config?: { systemInstruction?: string; temperature?: number };
    };
    expect(generateCall.config?.temperature).toBe(0.0);
    expect(generateCall.config?.systemInstruction).toContain("board-writer");
  });
});
