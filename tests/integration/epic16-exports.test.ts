import { generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  uploadImmutableWormObject,
  evidenceArtifactCreate,
  evidenceArtifactFindMany,
} = vi.hoisted(() => ({
  uploadImmutableWormObject: vi.fn(),
  evidenceArtifactCreate: vi.fn(),
  evidenceArtifactFindMany: vi.fn(),
}));

vi.mock("@/app/lib/evidence/supabaseWormStorage", () => ({
  uploadImmutableWormObject,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    evidenceArtifact: {
      create: evidenceArtifactCreate,
      findMany: evidenceArtifactFindMany,
    },
  },
}));

import { GET, POST } from "@/app/api/ironquery/export/route";
import {
  canonicalizeExportPayload,
  generateTamperEvidentSeal,
  verifyTamperEvidentSeal,
} from "@/src/services/ironquery/exportSigner";
import { normalizeCsvPayload } from "@/src/services/ironquery/csvNormalizer";

const TENANT_A = "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";
const TENANT_B = "4d1ea1a4-b6a8-4d12-9eb3-2f0a64ad0ef7";

describe("Epic 16 — enterprise exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IRONQUERY_EXPORT_TOKEN = "epic16-token";
    process.env.PUBLIC_KEY_ID = "EPIC16";

    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    process.env.PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    process.env.PUBLIC_KEY = publicKey.export({ type: "spki", format: "pem" }).toString();

    uploadImmutableWormObject.mockResolvedValue({
      ok: true,
      storagePath: "supabase://evidence-locker-worm/forensic/5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01/ironquery/report.csv.sealed.json",
      bucket: "evidence-locker-worm",
      objectPath: "forensic/5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01/ironquery/report.csv.sealed.json",
    });
    evidenceArtifactCreate.mockResolvedValue({ id: "artifact_epic16_1" });
    evidenceArtifactFindMany.mockResolvedValue([
      {
        id: "artifact_epic16_1",
        sha256: "abc",
        storagePath:
          "supabase://evidence-locker-worm/forensic/5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01/ironquery/report.csv.sealed.json",
        createdAt: new Date("2026-06-02T06:45:00.000Z"),
        uploadedByUserId: "auditor-1",
      },
    ]);
  });

  it("returns confirmed status and seal for valid payload export", async () => {
    const request = new NextRequest("https://ironframe-live.vercel.app/api/ironquery/export", {
      method: "POST",
      headers: {
        Authorization: "Bearer epic16-token",
        "Content-Type": "application/json",
        "x-tenant-id": TENANT_A,
        "x-user-id": "auditor-1",
      },
      body: JSON.stringify({
        tenantId: TENANT_A,
        format: "csv",
        classification: "forensic",
        payload: "name,ale\nalpha,100\n",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.status).toBe("CONFIRMED");
    expect(body.seal?.bodySha256).toMatch(/^[a-f0-9]{64}$/);
    expect(body.sealCheck?.ok).toBe(true);
    expect(uploadImmutableWormObject).toHaveBeenCalledTimes(1);
  });

  it("fails signature verification when canonical body is tampered by one byte", () => {
    const originalPayload = Buffer.from(canonicalizeExportPayload("rowA,rowB\n1,2\n")).toString("base64");
    const seal = generateTamperEvidentSeal({
      payload: originalPayload,
      tenantId: TENANT_A,
      generatedByUserId: "auditor-1",
      timestamp: "2026-06-02T06:45:00.000Z",
    });

    const tampered = Buffer.from(canonicalizeExportPayload("rowA,rowB\n1,3\n")).toString("base64");
    const verification = verifyTamperEvidentSeal({ payload: tampered, seal });
    expect(verification.ok).toBe(false);
  });

  it("normalizes out-of-order CSV columns deterministically", () => {
    const rows = [
      { zeta: "z", alpha: "a", amountCents: 1900n },
      { alpha: "b", amountCents: 2500n, zeta: "y" },
    ];
    const normalized = normalizeCsvPayload(rows, { columnOrder: ["alpha", "amountCents", "zeta"] });
    expect(normalized.split("\n")[0]).toBe("alpha,amountCents,zeta");

    const sealA = generateTamperEvidentSeal({
      payload: Buffer.from(canonicalizeExportPayload(normalized)).toString("base64"),
      tenantId: TENANT_A,
      generatedByUserId: "auditor-1",
      timestamp: "2026-06-02T06:45:00.000Z",
    });

    const reshuffled = normalizeCsvPayload(
      [
        { amountCents: 1900n, zeta: "z", alpha: "a" },
        { zeta: "y", alpha: "b", amountCents: 2500n },
      ],
      { columnOrder: ["alpha", "amountCents", "zeta"] },
    );
    const sealB = generateTamperEvidentSeal({
      payload: Buffer.from(canonicalizeExportPayload(reshuffled)).toString("base64"),
      tenantId: TENANT_A,
      generatedByUserId: "auditor-1",
      timestamp: "2026-06-02T06:45:00.000Z",
    });
    expect(sealA.bodySha256).toBe(sealB.bodySha256);
  });

  it("produces identical signatures for CRLF and LF line endings", () => {
    const crlf = "alpha,beta\r\n1,2\r\n";
    const lf = "alpha,beta\n1,2\n";
    const sealCrlf = generateTamperEvidentSeal({
      payload: Buffer.from(canonicalizeExportPayload(crlf)).toString("base64"),
      tenantId: TENANT_A,
      generatedByUserId: "auditor-1",
      timestamp: "2026-06-02T06:45:00.000Z",
    });
    const sealLf = generateTamperEvidentSeal({
      payload: Buffer.from(canonicalizeExportPayload(lf)).toString("base64"),
      tenantId: TENANT_A,
      generatedByUserId: "auditor-1",
      timestamp: "2026-06-02T06:45:00.000Z",
    });
    expect(sealCrlf.bodySha256).toBe(sealLf.bodySha256);
    expect(sealCrlf.signedDigest).toBe(sealLf.signedDigest);
  });

  it("blocks cross-tenant history retrieval attempts with 403", async () => {
    const request = new NextRequest(
      `https://ironframe-live.vercel.app/api/ironquery/export?tenantId=${TENANT_A}`,
      {
        method: "GET",
        headers: {
          Authorization: "Bearer epic16-token",
          "x-tenant-id": TENANT_B,
        },
      },
    );

    const response = await GET(request);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toContain("TENANT_MISMATCH");
  });
});
