import { vi } from "vitest";

/**
 * Shared Prisma mock for integration tests.
 * Wire in specs: `vi.mock("@/lib/prisma", () => ({ default: prismaMock }))`.
 */
export const prismaMock = {
  threatEvent: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  company: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  tenant: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
  chaosConfig: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
  riskEvent: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
};
