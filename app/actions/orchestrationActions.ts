"use server";

import type { AgentGraphState } from "@prisma/client";
import prisma from "@/lib/prisma";

function bigintSafeReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

function toJsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, bigintSafeReplacer)) as T;
}

export type WorkforceStateSnapshot = {
  threadId: string;
  tenantId: string;
  updatedAt: string;
  state: AgentGraphState["state"];
};

export async function getWorkforceState(threadId: string): Promise<WorkforceStateSnapshot | null> {
  const normalizedThreadId = threadId.trim();
  if (!normalizedThreadId) return null;

  const row = await prisma.agentGraphState.findUnique({
    where: { threadId: normalizedThreadId },
    select: {
      threadId: true,
      tenantId: true,
      updatedAt: true,
      state: true,
    },
  });

  if (!row) return null;

  return {
    threadId: row.threadId,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt.toISOString(),
    state: toJsonSafe(row.state),
  };
}

