"use server";

import { readIntegrityVaultSnapshotWithRegistry } from "@/app/lib/integrityVaultServer";
import type { IntegrityVaultSnapshot } from "@/app/types/integrityVault";

/** Re-read manifest + workforce registry after operator requests vault handshake. */
export async function reverifyLkgColdStoreAction(): Promise<IntegrityVaultSnapshot> {
  return readIntegrityVaultSnapshotWithRegistry();
}
