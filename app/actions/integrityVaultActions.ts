"use server";

import { readIntegrityVaultSnapshot } from "@/app/lib/integrityVaultServer";
import type { IntegrityVaultSnapshot } from "@/app/types/integrityVault";

/** Re-read G:\ manifest after operator requests vault handshake (same read path as Scenario 5). */
export async function reverifyLkgColdStoreAction(): Promise<IntegrityVaultSnapshot> {
  return readIntegrityVaultSnapshot();
}
