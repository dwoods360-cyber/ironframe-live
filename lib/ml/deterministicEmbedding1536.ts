import { createHash } from "crypto";

const DIM = 1536;

/**
 * Deterministic 1536-D unit vector for hybrid KNN smoke tests and preview paths when no live embedder is configured.
 * Normalized for cosine distance via pgvector `<=>`.
 */
export function deterministicUnitEmbeddingFromText(utf8: string): number[] {
  const seed = createHash("sha256").update(utf8, "utf8").digest();
  const out: number[] = new Array(DIM);
  let h = seed;
  for (let i = 0; i < DIM; i++) {
    if (i % 32 === 0 && i > 0) {
      h = createHash("sha256").update(h).update(Uint8Array.of(i & 0xff, (i >> 8) & 0xff)).digest();
    }
    const b0 = h[i % 32] ?? 0;
    const b1 = h[(i + 7) % 32] ?? 0;
    out[i] = (b0 / 255) * 2 - 1 + ((b1 / 255) - 0.5) * 1e-6;
  }
  let norm = 0;
  for (const v of out) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}
