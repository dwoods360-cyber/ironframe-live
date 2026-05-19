/**
 * Compatibility entry — canonical Irontech freeze (24h sustainability stale lockdown) lives under
 * `src/services/irontech/freezeEngine.ts` (reads `SystemConfig` BigInt-safe fields via Prisma).
 */
export {
  getIrontechFreezeEngineSnapshot,
  type IrontechFreezeEngineSnapshot,
} from "@/src/services/irontech/freezeEngine";
