/**
 * Format integer USD cents (BigInt) for display — no float math on monetary values.
 */
export function formatUsdCentsBigInt(cents: bigint): string {
  const negative = cents < 0n;
  let n = negative ? -cents : cents;
  const dollars = n / 100n;
  const frac = n % 100n;
  const fracStr = frac < 10n ? `0${frac}` : `${frac}`;
  const dStr = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${dStr}.${fracStr}`;
}

export function toBigIntCents(value: bigint | number | string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return 0n;
    try {
      return BigInt(t);
    } catch {
      return 0n;
    }
  }
  if (!Number.isFinite(value) || !Number.isInteger(value)) return 0n;
  return BigInt(Math.trunc(value));
}
