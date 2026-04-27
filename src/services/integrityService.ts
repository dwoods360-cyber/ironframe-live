import { createHash } from "crypto";
import { EventSource, type IntegrityEvent, type Prisma } from "@prisma/client";

type LedgerEntryInput = {
  tenantId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorUserId: string;
  payload: unknown;
  source?: EventSource;
};

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const body = keys
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(obj[key])}`)
    .join(",");
  return `{${body}}`;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

class IntegrityService {
  private static instance: IntegrityService | null = null;

  static getInstance(): IntegrityService {
    if (!IntegrityService.instance) {
      IntegrityService.instance = new IntegrityService();
    }
    return IntegrityService.instance;
  }

  /** Alias for GRC audit clarity — identical hashing chain semantics. */
  logEvent(
    tx: Prisma.TransactionClient,
    data: LedgerEntryInput,
  ): Promise<IntegrityEvent> {
    return this.createLedgerEntry(tx, data);
  }

  async createLedgerEntry(
    tx: Prisma.TransactionClient,
    data: LedgerEntryInput,
  ): Promise<IntegrityEvent> {
    const canonicalPayload = stableSerialize(data.payload);
    const payloadHash = sha256Hex(canonicalPayload);
    const previous = await tx.integrityEvent.findFirst({
      where: { tenantId: data.tenantId },
      orderBy: { createdAt: "desc" },
      select: { eventHash: true },
    });
    const prevEventHash = previous?.eventHash ?? null;
    const eventHash = sha256Hex(`${prevEventHash ?? "GENESIS"}:${payloadHash}`);
    const source =
      data.source && data.source !== EventSource.ADMIN
        ? data.source
        : EventSource.SYSTEM;

    return tx.integrityEvent.create({
      data: {
        tenantId: data.tenantId,
        eventType: data.eventType,
        entityType: data.entityType,
        entityId: data.entityId,
        payloadHash,
        prevEventHash,
        eventHash,
        actorUserId: data.actorUserId,
        source,
      },
    });
  }
}

export const integrityService = IntegrityService.getInstance();
export type { LedgerEntryInput };
