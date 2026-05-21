import "server-only";

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";

export type ChaosConstitutionalVoidRecord = {
  tenantId: string;
  scenario: "CONSTITUTIONAL_COLLAPSE";
  voidedAt: string;
  /** Simulated invalid hash fingerprint shown in integrity APIs. */
  simulatedVoidHash: string;
};

const VOID_DIR = join(process.cwd(), "storage", "constitutional", "chaos-void");

const activeByTenant = new Map<string, ChaosConstitutionalVoidRecord>();

function voidFilePath(tenantId: string): string {
  return join(VOID_DIR, `${tenantId.trim().toLowerCase()}.json`);
}

function readFileRecord(tenantId: string): ChaosConstitutionalVoidRecord | null {
  try {
    const path = voidFilePath(tenantId);
    if (!existsSync(path)) return null;
    const raw = JSON.parse(readFileSync(path, "utf8")) as ChaosConstitutionalVoidRecord;
    if (raw.tenantId?.trim() !== tenantId.trim()) return null;
    return raw;
  } catch {
    return null;
  }
}

function writeFileRecord(record: ChaosConstitutionalVoidRecord): void {
  if (!existsSync(VOID_DIR)) mkdirSync(VOID_DIR, { recursive: true });
  writeFileSync(voidFilePath(record.tenantId), JSON.stringify(record, null, 2), "utf8");
}

export function isChaosConstitutionalVoidActive(tenantId: string | null | undefined): boolean {
  if (!tenantId?.trim()) return false;
  const key = tenantId.trim().toLowerCase();
  if (activeByTenant.has(key)) return true;
  return Boolean(readFileRecord(tenantId));
}

export function getChaosConstitutionalVoidRecord(
  tenantId: string,
): ChaosConstitutionalVoidRecord | null {
  const key = tenantId.trim().toLowerCase();
  return activeByTenant.get(key) ?? readFileRecord(tenantId);
}

export async function setChaosConstitutionalVoid(
  tenantId: string,
  params?: { simulatedVoidHash?: string },
): Promise<ChaosConstitutionalVoidRecord> {
  const tid = tenantId.trim();
  const record: ChaosConstitutionalVoidRecord = {
    tenantId: tid,
    scenario: "CONSTITUTIONAL_COLLAPSE",
    voidedAt: new Date().toISOString(),
    simulatedVoidHash:
      params?.simulatedVoidHash?.trim() ||
      "0000000000000000000000000000000000000000000000000000000000000000",
  };
  activeByTenant.set(tid.toLowerCase(), record);
  writeFileRecord(record);
  return record;
}

export function clearChaosConstitutionalVoid(tenantId: string): void {
  const tid = tenantId.trim();
  activeByTenant.delete(tid.toLowerCase());
  try {
    const path = voidFilePath(tid);
    if (existsSync(path)) unlinkSync(path);
  } catch {
    /* best-effort */
  }
}
