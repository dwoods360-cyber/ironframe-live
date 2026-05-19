import "server-only";

import { createHash, randomUUID } from "crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import prisma from "@/lib/prisma";
import { encryptLastWillPayload, decryptLastWillPayload } from "@/lib/security/lwtCrypto";
import { getTasFingerprintSnapshot } from "@/app/utils/tasFingerprint";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";

export const LWT_SENT_ACTION = "LWT_SENT";
export const LWT_LINGER_MS_DEFAULT = 30_000;
export const LWT_SIMULATION_DATA_TAG = "[SIMULATION_DATA]";

export type LastWillPlaintext = {
  generatedAt: string;
  archiveId: string;
  triggerTenantId: string | null;
  simulationDataTag?: string;
  constitutionalHash: string | null;
  auditEntries: Array<{
    id: string;
    action: string;
    operatorId: string;
    createdAt: string;
    justification: string | null;
  }>;
  witnessLog: Array<{
    id: string;
    context: string;
    custodianRole: string;
    clientIp: string;
    fingerprintHash: string;
    createdAt: string;
  }>;
};

const LWT_DIR = join(process.cwd(), "storage", "constitutional", "lwt");

export function resolveLwtLingerMs(): number {
  const sec = Number(process.env.LWT_PRE_DMS_SECONDS);
  if (Number.isFinite(sec) && sec > 0) return Math.floor(sec * 1000);
  return LWT_LINGER_MS_DEFAULT;
}

async function collectLastWillPlaintext(
  triggerTenantId: string | null,
  isSimulation: boolean,
): Promise<LastWillPlaintext> {
  const archiveId = randomUUID();
  const snap = getTasFingerprintSnapshot({ forceRefresh: true });

  const auditWhere = triggerTenantId
    ? {
        OR: [
          { tenantId: triggerTenantId },
          { governance_tenant_uuid: triggerTenantId },
        ],
      }
    : {};

  let auditEntries: LastWillPlaintext["auditEntries"] = [];
  try {
    const rows = await prisma.auditLog.findMany({
      where: auditWhere,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        action: true,
        operatorId: true,
        createdAt: true,
        justification: true,
      },
    });
    auditEntries = rows.map((r) => ({
      id: r.id,
      action: r.action,
      operatorId: r.operatorId,
      createdAt: r.createdAt.toISOString(),
      justification: r.justification,
    }));
  } catch {
    auditEntries = [];
  }

  let witnessLog: LastWillPlaintext["witnessLog"] = [];
  try {
    const witnesses = await prisma.entryWitness.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    witnessLog = witnesses.map((w) => ({
      id: w.id,
      context: w.context,
      custodianRole: w.custodianRole,
      clientIp: w.clientIp,
      fingerprintHash: w.fingerprintHash,
      createdAt: w.createdAt.toISOString(),
    }));
  } catch {
    witnessLog = [];
  }

  return {
    generatedAt: new Date().toISOString(),
    archiveId,
    triggerTenantId,
    simulationDataTag: isSimulation ? LWT_SIMULATION_DATA_TAG : undefined,
    constitutionalHash: snap.sha256,
    auditEntries,
    witnessLog,
  };
}

function writeLocalLwtArchive(archiveId: string, ciphertext: string, meta: Record<string, unknown>): void {
  if (!existsSync(LWT_DIR)) mkdirSync(LWT_DIR, { recursive: true });
  const path = join(LWT_DIR, `${archiveId}.json`);
  writeFileSync(
    path,
    JSON.stringify({ archiveId, ciphertext, ...meta }, null, 2),
    "utf8",
  );
}

async function postLwtToForensicEndpoint(
  archiveId: string,
  ciphertext: string,
  isSimulation: boolean,
): Promise<boolean> {
  const url = process.env.LWT_FORENSIC_ENDPOINT_URL?.trim();
  if (!url) return false;

  const bearer = process.env.LWT_FORENSIC_BEARER_TOKEN?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Ironframe-LWT-Archive-Id": archiveId,
  };
  if (isSimulation) {
    headers["X-Ironframe-Simulation"] = "1";
    headers["X-Ironframe-LWT-Tag"] = LWT_SIMULATION_DATA_TAG;
  }
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        archiveId,
        ciphertext,
        contentType: "application/vnd.ironframe.lwt+aes256gcm",
        uploadedAt: new Date().toISOString(),
        simulationDataTag: isSimulation ? LWT_SIMULATION_DATA_TAG : undefined,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("[sendLastWillAndTestament] off-site POST failed", e);
    return false;
  }
}

export type SendLastWillResult = {
  archiveId: string;
  postedOffSite: boolean;
  payloadSha256: string;
};

/**
 * Encrypt and ship Last Will (50 audit + witness + constitutional hash) ~30s before DMS zero.
 */
export type SendLastWillOptions = {
  isSimulation?: boolean;
};

export async function sendLastWillAndTestament(
  triggerTenantId: string | null,
  options?: SendLastWillOptions,
): Promise<SendLastWillResult> {
  const isSimulation = options?.isSimulation === true;
  const plaintext = await collectLastWillPlaintext(triggerTenantId, isSimulation);
  const json = JSON.stringify(plaintext);
  const ciphertext = encryptLastWillPayload(json);
  const payloadSha256 = createHash("sha256").update(ciphertext, "utf8").digest("hex");

  writeLocalLwtArchive(plaintext.archiveId, ciphertext, {
    triggerTenantId,
    payloadSha256,
    sentAt: new Date().toISOString(),
    simulationDataTag: isSimulation ? LWT_SIMULATION_DATA_TAG : undefined,
  });

  const postedOffSite = await postLwtToForensicEndpoint(
    plaintext.archiveId,
    ciphertext,
    isSimulation,
  );

  const justificationPrefix = isSimulation ? `${LWT_SIMULATION_DATA_TAG} ` : "";

  try {
    await auditLogCreateLoose({
      data: {
        action: LWT_SENT_ACTION,
        justification: `${justificationPrefix}${JSON.stringify({
          event: "LAST_WILL_AND_TESTAMENT",
          archiveId: plaintext.archiveId,
          postedOffSite,
          payloadSha256,
          triggerTenantId,
          simulationDataTag: isSimulation ? LWT_SIMULATION_DATA_TAG : undefined,
        })}`,
        operatorId: "SYSTEM_DMS",
        threatId: null,
        isSimulation,
        governance_tenant_uuid: triggerTenantId ?? undefined,
      },
    });
  } catch (e) {
    console.error("[sendLastWillAndTestament] audit failed", e);
  }

  try {
    const { appendChaosRunEvent } = await import("@/app/lib/chaosRunTelemetry");
    if (triggerTenantId) {
      appendChaosRunEvent(triggerTenantId, "LWT_SENT", {
        archiveId: plaintext.archiveId,
        postedOffSite,
        simulationDataTag: isSimulation ? LWT_SIMULATION_DATA_TAG : undefined,
        minJustificationLength:
          plaintext.auditEntries.length > 0
            ? Math.min(...plaintext.auditEntries.map((e) => (e.justification ?? "").trim().length))
            : 0,
      });
    }
  } catch {
    /* optional */
  }

  return {
    archiveId: plaintext.archiveId,
    postedOffSite,
    payloadSha256,
  };
}

export async function fetchLastWillFromOffSite(archiveId: string): Promise<LastWillPlaintext | null> {
  const fetchBase = process.env.LWT_FORENSIC_FETCH_URL?.trim() || process.env.LWT_FORENSIC_ENDPOINT_URL?.trim();
  if (fetchBase) {
    const bearer = process.env.LWT_FORENSIC_BEARER_TOKEN?.trim();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    const url = fetchBase.includes("?")
      ? `${fetchBase}&archiveId=${encodeURIComponent(archiveId)}`
      : `${fetchBase.replace(/\/$/, "")}/${encodeURIComponent(archiveId)}`;
    try {
      const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
      if (res.ok) {
        const body = (await res.json()) as { ciphertext?: string };
        if (body.ciphertext) {
          const plain = decryptLastWillPayload(body.ciphertext);
          return JSON.parse(plain) as LastWillPlaintext;
        }
      }
    } catch (e) {
      console.error("[fetchLastWillFromOffSite] remote fetch failed", e);
    }
  }

  const localPath = join(LWT_DIR, `${archiveId}.json`);
  if (!existsSync(localPath)) return null;
  try {
    const raw = JSON.parse(readFileSync(localPath, "utf8")) as { ciphertext?: string };
    if (!raw.ciphertext) return null;
    const plain = decryptLastWillPayload(raw.ciphertext);
    return JSON.parse(plain) as LastWillPlaintext;
  } catch {
    return null;
  }
}

export function findLatestLocalLwtArchiveId(): string | null {
  if (!existsSync(LWT_DIR)) return null;
  try {
    const files = readdirSync(LWT_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();
    if (jsonFiles.length === 0) return null;
    return jsonFiles[0]!.replace(/\.json$/, "");
  } catch {
    return null;
  }
}
