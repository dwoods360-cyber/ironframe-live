const usdFormatSynthetic = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsdFromCentsString(centsStr: string): string {
  const raw = centsStr.trim();
  if (!/^-?\d+$/.test(raw)) return "—";
  const cents = BigInt(raw);
  const neg = cents < 0n;
  const abs = neg ? -cents : cents;
  const dollars = Number(abs) / 100;
  return usdFormatSynthetic.format(neg ? -dollars : dollars);
}

export function formatSyntheticLastAttacked(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
