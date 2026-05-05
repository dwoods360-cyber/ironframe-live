import { createHash } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/app/utils/serverAuth", () => ({
  getSupabaseSessionUser: vi.fn(async () => ({
    id: "user-ciso-001",
    email: "ciso@ironframe.local",
  })),
}));

vi.mock("@/src/services/integrityService", () => ({
  integrityService: {
    logEvent: vi.fn(async () => ({ payloadHash: "payload-hash-from-ledger" })),
    createLedgerEntry: vi.fn(async () => ({ eventHash: "ledger-event-hash" })),
  },
}));

type ThreatRow = {
  id: string;
  tenantCompanyId: bigint;
  targetEntity: string;
  ingestionDetails: string | null;
  status: string;
  resolutionApprovalId: string | null;
  financialRisk_cents: bigint;
  title: string;
  sourceAgent: string;
  assigneeId: string | null;
  aiReport: string | null;
  ttlSeconds: number | null;
  remoteTechId: string | null;
  isRemoteAccessAuthorized: boolean;
};

type ApprovalRow = {
  id: string;
  tenantId: string;
  threatId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedByUserId: string;
  approvedByUserId: string | null;
  approvalNote: string;
  approvalPayloadHash: string | null;
  createdAt: Date;
  approvedAt: Date | null;
};

type ArtifactRow = {
  id: string;
  tenantId: string;
  uploadedByUserId: string;
  sha256: string;
  storagePath: string;
  mimeType: string;
  createdAt: Date;
};

type AttachmentRow = {
  id: string;
  tenantId: string;
  artifactId: string;
  entityType: "THREAT_EVENT";
  entityId: string;
  attachedByUserId: string;
  attachmentNote: string | null;
  createdAt: Date;
};

type IntegrityRow = {
  id: string;
  tenantId: string;
  payloadHash: string;
  prevEventHash: string | null;
  eventHash: string;
  createdAt: Date;
};

const state = {
  threat: null as ThreatRow | null,
  approvals: [] as ApprovalRow[],
  artifacts: [] as ArtifactRow[],
  attachments: [] as AttachmentRow[],
  integrityEvents: [] as IntegrityRow[],
  quarantineRecords: [] as Array<{ id: string; tenantId: string; storagePath: string; status: string }>,
};

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {} as any,
}));

Object.assign(prismaMock, {
  threatEvent: {
    findUnique: vi.fn(async (args: any) => {
      const threat = state.threat;
      const id = args?.where?.id;
      if (!threat || threat.id !== id) return null;
      if (args?.select?.id && args?.select?.tenantCompanyId && args?.select?.resolutionApprovalId) {
        return {
          id: threat.id,
          tenantCompanyId: threat.tenantCompanyId,
          resolutionApprovalId: threat.resolutionApprovalId,
        };
      }
      if (args?.select?.id && args?.select?.tenantCompanyId) {
        return { id: threat.id, tenantCompanyId: threat.tenantCompanyId };
      }
      if (args?.select?.id) return { id: threat.id };
      if (args?.select?.tenantCompanyId || args?.select?.resolutionApprovalId) {
        return {
          id: threat.id,
          tenantCompanyId: threat.tenantCompanyId,
          resolutionApprovalId: threat.resolutionApprovalId,
        };
      }
      if (args?.select?.targetEntity || args?.select?.ingestionDetails) {
        return {
          targetEntity: threat.targetEntity,
          ingestionDetails: threat.ingestionDetails,
        };
      }
      return threat;
    }),
    findFirst: vi.fn(async (args: any) => {
      const threat = state.threat;
      if (threat && args?.where?.targetEntity && threat.targetEntity === args.where.targetEntity) {
        return { id: threat.id };
      }
      return null;
    }),
    update: vi.fn(async (args: any) => {
      if (!state.threat || args?.where?.id !== state.threat.id) throw new Error("threat not found");
      state.threat = {
        ...state.threat,
        ...(args.data ?? {}),
      };
      const updatedThreat = state.threat as ThreatRow;
      if (args?.select?.financialRisk_cents) {
        return { financialRisk_cents: updatedThreat.financialRisk_cents };
      }
      return { id: updatedThreat.id };
    }),
  },
  company: {
    findUnique: vi.fn(async () => ({ tenantId: "tenant-medshield-uuid" })),
  },
  threatApproval: {
    create: vi.fn(async (args: any) => {
      const row: ApprovalRow = {
        id: `approval-${state.approvals.length + 1}`,
        tenantId: args.data.tenantId,
        threatId: args.data.threatId,
        status: args.data.status,
        requestedByUserId: args.data.requestedByUserId,
        approvedByUserId: null,
        approvalNote: args.data.approvalNote,
        approvalPayloadHash: args.data.approvalPayloadHash,
        createdAt: new Date(),
        approvedAt: null,
      };
      state.approvals.push(row);
      return { id: row.id };
    }),
    findUnique: vi.fn(async (args: any) => {
      const aid = args?.where?.id;
      const row = state.approvals.find((a) => a.id === aid) ?? null;
      if (!row) return null;
      if (args?.select?.threat) {
        return {
          id: row.id,
          status: row.status,
          tenantId: row.tenantId,
          threatId: row.threatId,
          threat: state.threat
            ? {
                id: state.threat.id,
                targetEntity: state.threat.targetEntity,
                ingestionDetails: state.threat.ingestionDetails,
              }
            : null,
        };
      }
      return row;
    }),
    update: vi.fn(async (args: any) => {
      const aid = args?.where?.id;
      const idx = state.approvals.findIndex((a) => a.id === aid);
      if (idx < 0) throw new Error("approval not found");
      state.approvals[idx] = { ...state.approvals[idx], ...(args.data ?? {}) };
      return state.approvals[idx];
    }),
    delete: vi.fn(async (args: any) => {
      const aid = args?.where?.id;
      state.approvals = state.approvals.filter((a) => a.id !== aid);
      return { id: aid };
    }),
  },
  evidenceArtifact: {
    findFirst: vi.fn(async (args: any) => {
      const aid = args?.where?.id;
      const tid = args?.where?.tenantId;
      return state.artifacts.find((a) => a.id === aid && a.tenantId === tid) ?? null;
    }),
    findMany: vi.fn(async (args: any) => {
      const tid = args?.where?.tenantId;
      const threatId = args?.where?.attachments?.some?.entityId;
      return state.artifacts
        .filter((a) => a.tenantId === tid)
        .filter((a) =>
          state.attachments.some(
            (at) => at.artifactId === a.id && at.entityType === "THREAT_EVENT" && at.entityId === threatId,
          ),
        )
        .map((a) => ({ storagePath: a.storagePath }));
    }),
  },
  evidenceAttachment: {
    create: vi.fn(async (args: any) => {
      const row: AttachmentRow = {
        id: `attachment-${state.attachments.length + 1}`,
        tenantId: args.data.tenantId,
        artifactId: args.data.artifactId,
        entityType: args.data.entityType,
        entityId: args.data.entityId,
        attachedByUserId: args.data.attachedByUserId,
        attachmentNote: args.data.attachmentNote ?? null,
        createdAt: new Date(),
      };
      state.attachments.push(row);
      return row;
    }),
    findFirst: vi.fn(async (args: any) => {
      return (
        state.attachments.find(
          (a) =>
            a.tenantId === args?.where?.tenantId &&
            a.entityType === args?.where?.entityType &&
            a.entityId === args?.where?.entityId,
        ) ?? null
      );
    }),
  },
  integrityEvent: {
    findFirst: vi.fn(async () => {
      if (state.integrityEvents.length === 0) return null;
      return state.integrityEvents[state.integrityEvents.length - 1];
    }),
    create: vi.fn(async (args: any) => {
      const row: IntegrityRow = {
        id: `integrity-${state.integrityEvents.length + 1}`,
        tenantId: args.data.tenantId,
        payloadHash: args.data.payloadHash,
        prevEventHash: args.data.prevEventHash,
        eventHash: args.data.eventHash,
        createdAt: args.data.createdAt ?? new Date(),
      };
      state.integrityEvents.push(row);
      return row;
    }),
  },
  quarantineRecord: {
    updateMany: vi.fn(async (args: any) => {
      const matches = state.quarantineRecords.filter(
        (q) =>
          q.tenantId === args?.where?.tenantId &&
          (args?.where?.storagePath?.in ?? []).includes(q.storagePath),
      );
      for (const row of matches) row.status = args?.data?.status ?? row.status;
      return { count: matches.length };
    }),
  },
  userRoleAssignment: {
    findFirst: vi.fn(async () => ({ id: "role-ciso" })),
  },
  syntheticEmployee: {
    findUnique: vi.fn(async () => null),
    findFirst: vi.fn(async () => null),
    update: vi.fn(async () => null),
    updateMany: vi.fn(async () => ({ count: 0 })),
  },
  auditLog: {
    create: vi.fn(async () => ({ id: "audit-1", createdAt: new Date() })),
  },
  workNote: {
    create: vi.fn(async () => ({ id: "note-1" })),
  },
  $transaction: vi.fn(async (callback: any) => {
    if (typeof callback === "function") return callback(prismaMock as any);
    return Promise.all(callback);
  }),
});

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

import {
  approveThreatResolution,
  requestThreatResolution,
  resolveThreatAction,
} from "@/app/actions/threatActions";
import { attachEvidenceToThreat } from "@/app/actions/evidenceActions";

describe("Epic 11 bank vault positive chain", () => {
  beforeEach(() => {
    state.threat = {
      id: "threat-bank-vault-success",
      tenantCompanyId: 9001n,
      targetEntity: "target@ironframe.local",
      ingestionDetails: "{}",
      status: "CONFIRMED",
      resolutionApprovalId: null,
      financialRisk_cents: 920_000_000n,
      title: "Vault chain success threat",
      sourceAgent: "IRONCORE",
      assigneeId: null,
      aiReport: null,
      ttlSeconds: 259200,
      remoteTechId: null,
      isRemoteAccessAuthorized: false,
    };
    state.approvals = [];
    state.attachments = [];
    state.integrityEvents = [];
    state.artifacts = [
      {
        id: "artifact-uploaded-1",
        tenantId: "tenant-medshield-uuid",
        uploadedByUserId: "user-ciso-001",
        sha256: "sha256-abc",
        storagePath: "uploads/evidence/tenant-medshield-uuid/artifact-uploaded-1.bin",
        mimeType: "application/octet-stream",
        createdAt: new Date("2026-04-27T12:00:00.000Z"),
      },
    ];
    state.quarantineRecords = [
      {
        id: "qr-1",
        tenantId: "tenant-medshield-uuid",
        storagePath: "uploads/evidence/tenant-medshield-uuid/artifact-uploaded-1.bin",
        status: "QUARANTINED",
      },
    ];
  });

  it("creates chain and resolves with permanent quarantine promotion + valid integrity event hash", async () => {
    const attached = await attachEvidenceToThreat(
      "artifact-uploaded-1",
      "threat-bank-vault-success",
      "Attachment for vault chain.",
    );
    expect(attached.success).toBe(true);

    const requested = await requestThreatResolution(
      "threat-bank-vault-success",
      "Requesting formal resolution with evidence and immutable audit chain.",
      "artifact-uploaded-1",
    );
    expect(requested.success).toBe(true);
    if (!requested.success) throw new Error("request failed unexpectedly");

    const approved = await approveThreatResolution(requested.approvalId);
    expect(approved.success).toBe(true);

    const resolved = await resolveThreatAction(
      "threat-bank-vault-success",
      "user-ciso-001",
      "Finalized mitigation with approved attestation and evidence artifact under Epic 11 controls.",
      "CISO",
    );
    expect(resolved.success).toBe(true);

    expect(state.threat?.status).toBe("RESOLVED");
    expect(state.threat?.resolutionApprovalId).toBe(requested.approvalId);
    expect(state.quarantineRecords[0]?.status).toBe("PERMANENT");

    expect(state.integrityEvents.length).toBeGreaterThan(0);
    for (const evt of state.integrityEvents) {
      const computed = createHash("sha256")
        .update(`${evt.payloadHash}|${evt.prevEventHash ?? ""}|${evt.createdAt.toISOString()}`)
        .digest("hex");
      expect(evt.eventHash).toBe(computed);
    }
  });
});
