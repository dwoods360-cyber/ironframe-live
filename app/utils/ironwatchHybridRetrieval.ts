/**
 * Flemming Protocol hybrid: dense-style token cosine (“vector”) + sparse BM25-style ranking.
 *
 * Database path (pgvector HNSW + HASH-partitioned `agent13_hybrid_chunk`, PG18 AIO-friendly session):
 * use `runHybridRetrievalSession` + `searchAgent13HybridCorpus` / `searchAgent13LexicalCorpus` from `@/lib/db/agent13HybridSearch`.
 * This module remains the in-process fallback when embeddings are not yet materialized in Postgres.
 */

export type HybridRecallResult = {
  matched: boolean;
  /** 0–1 fused score (max of normalized cosine and normalized BM25). */
  vectorRecallScore: number;
};

/** Flemming hybrid detail — cosine “vector” distance for Agent 13 drift gate. */
export type FlemmingHybridRecallResult = HybridRecallResult & {
  /** Best token-cosine similarity vs corpus [0,1]. */
  bestCosineSimilarity: number;
  /** Semantic distance = 1 − bestCosine (same order as 1 − cosine similarity). */
  semanticDistance: number;
};

function tokenizeForVector(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9-]/g, ""))
      .filter((t) => t.length > 2),
  );
}

function cosineTokenSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  return inter / Math.sqrt(a.size * b.size);
}

/** Slightly relaxed for Postgres 18 hybrid recall; tighten when pairing with pgvector embeddings. */
const DEFAULT_VECTOR_THRESHOLD = 0.2;

/**
 * Lexical "vector" pass: max cosine similarity between query tokens and each corpus document.
 */
export function computeHybridLexicalRecall(
  query: string,
  corpusTexts: readonly string[],
  vectorThreshold = DEFAULT_VECTOR_THRESHOLD,
): HybridRecallResult {
  const qTokens = tokenizeForVector(query);
  let best = 0;
  for (const doc of corpusTexts) {
    const dTokens = tokenizeForVector(doc);
    const sim = cosineTokenSimilarity(qTokens, dTokens);
    if (sim > best) best = sim;
  }
  return {
    matched: best >= vectorThreshold,
    vectorRecallScore: best,
  };
}

const BM25_K1 = 1.2;
const BM25_B = 0.75;

function termFreqs(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) {
    m.set(t, (m.get(t) ?? 0) + 1);
  }
  return m;
}

/** Best BM25-style score per doc vs query; normalized ~0–1 via tanh for fusion with cosine. */
function computeBestBm25Normalized(query: string, corpusTexts: readonly string[]): number {
  const qTokens = [...tokenizeForVector(query)];
  if (qTokens.length === 0 || corpusTexts.length === 0) return 0;

  const docTokenLists = corpusTexts.map((d) => [...tokenizeForVector(d)]);
  const docLens = docTokenLists.map((t) => t.length);
  const avgdl = docLens.reduce((a, b) => a + b, 0) / Math.max(1, docLens.length);

  const df = new Map<string, number>();
  for (const tokens of docTokenLists) {
    const seen = new Set(tokens);
    for (const t of seen) {
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }

  const N = corpusTexts.length;
  let bestRaw = 0;

  for (let i = 0; i < corpusTexts.length; i++) {
    const tokens = docTokenLists[i];
    const dl = docLens[i] || 1;
    const tfMap = termFreqs(tokens);
    let score = 0;
    for (const term of qTokens) {
      const tf = tfMap.get(term) ?? 0;
      if (tf === 0) continue;
      const nqi = df.get(term) ?? 1;
      const idf = Math.log(1 + (N - nqi + 0.5) / (nqi + 0.5));
      const denom = tf + BM25_K1 * (1 - BM25_B + (BM25_B * dl) / Math.max(avgdl, 1));
      score += (idf * (tf * (BM25_K1 + 1))) / Math.max(denom, 1e-6);
    }
    if (score > bestRaw) bestRaw = score;
  }

  return Math.tanh(bestRaw / 4);
}

const DEFAULT_BM25_THRESHOLD = 0.28;

/**
 * Flemming hybrid: max lexical cosine (vector-style) + BM25-ranked lexical match + semantic distance.
 */
export function computeHybridFlemmingRecall(
  query: string,
  corpusTexts: readonly string[],
  vectorThreshold = DEFAULT_VECTOR_THRESHOLD,
  bm25Threshold = DEFAULT_BM25_THRESHOLD,
): FlemmingHybridRecallResult {
  const dense = computeHybridLexicalRecall(query, corpusTexts, vectorThreshold);
  const bestCosine = corpusTexts.length === 0 ? 0 : dense.vectorRecallScore;
  const bm25N = computeBestBm25Normalized(query, corpusTexts);
  const fused = Math.max(dense.vectorRecallScore, bm25N);
  const matched = dense.matched || bm25N >= bm25Threshold;
  const semanticDistance = Math.min(1, Math.max(0, 1 - bestCosine));
  return {
    matched,
    vectorRecallScore: fused,
    bestCosineSimilarity: bestCosine,
    semanticDistance,
  };
}
