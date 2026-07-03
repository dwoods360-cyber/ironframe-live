/**
 * Control-first JSON serialization for Prisma BIGINT / BigInt cent fields.
 * Install globally via `lib/prisma.ts` + `instrumentation.ts`; use helpers at API boundaries.
 */

export function bigintReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  return value;
}

/** Deep-clone via JSON round-trip — BigInt → string, Date → ISO string. */
export function toJsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, bigintReplacer)) as T;
}

/** `NextResponse.json` / Server Action safe stringify (never throws on BigInt). */
export function stringifyJsonSafe(value: unknown, space?: number): string {
  return JSON.stringify(value, bigintReplacer, space);
}

/** Idempotent global hook — safe to call multiple times. */
export function installBigIntJsonPrototype(): void {
  const proto = BigInt.prototype as unknown as { toJSON?: () => string };
  if (!proto.toJSON) {
    proto.toJSON = function toJSON(this: bigint) {
      return this.toString();
    };
  }
}
