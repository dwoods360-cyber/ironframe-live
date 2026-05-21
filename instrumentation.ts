/**
 * Load before other server bundles so `BigInt.prototype.toJSON` (see lib/prisma.ts) is installed
 * for any route that serializes Prisma decimals / BIGINT without importing `@/lib/prisma` first.
 */
export async function register(): Promise<void> {
  await import("@/lib/prisma");
}
