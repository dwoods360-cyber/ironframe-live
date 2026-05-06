import type { PrismaClient } from "@prisma/client";
import { runHybridRetrievalSession } from "@/lib/db/hybridRetrievalSession";

export type Agent13ChunkMatch = {
  id: string;
  tenant_company_id: bigint;
  source_kind: string;
  source_id: string;
  similarity: number;
};

const EMBED_DIM = 1536;

function toVectorLiteral(values: readonly number[]): string {
  if (values.length !== EMBED_DIM) {
    throw new Error(`Agent 13 corpus expects ${EMBED_DIM}-dimensional embeddings (got ${values.length}).`);
  }
  if (!values.every((v) => Number.isFinite(v))) {
    throw new Error("Embedding values must be finite numbers.");
  }
  return `[${values.join(",")}]`;
}

/**
 * KNN over HASH-partitioned `agent13_hybrid_chunk` using pgvector `<=>` (cosine distance).
 * Always filter `tenant_company_id` first for partition pruning + tenant isolation.
 *
 * Wrapped in `runHybridRetrievalSession` for partition-wise / parallel-friendly plans (complements PG18 AIO).
 */
export async function searchAgent13HybridCorpus(
  prisma: PrismaClient,
  params: {
    tenantCompanyId: bigint;
    queryEmbedding: readonly number[];
    limit?: number;
  },
): Promise<Agent13ChunkMatch[]> {
  const limit = Math.min(Math.max(params.limit ?? 8, 1), 64);
  const vec = toVectorLiteral(params.queryEmbedding);
  const tid = params.tenantCompanyId;

  return runHybridRetrievalSession(prisma, async (tx) => {
    try {
      await tx.$executeRawUnsafe(`SELECT set_config('hnsw.ef_search', '64', true)`);
    } catch {
      /* pgvector HNSW tuning optional on clusters without the custom GUC */
    }
    const rows = await tx.$queryRawUnsafe<Agent13ChunkMatch[]>(
      `
      SELECT
        id,
        tenant_company_id,
        source_kind,
        source_id,
        (1 - (embedding <=> $1::vector))::float8 AS similarity
      FROM agent13_hybrid_chunk
      WHERE tenant_company_id = $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
      `,
      vec,
      tid,
      limit,
    );
    return rows;
  });
}

/**
 * Hybrid leg: lexical tsvector match via `ts_rank_cd` + `plainto_tsquery`.
 */
export async function searchAgent13LexicalCorpus(
  prisma: PrismaClient,
  params: {
    tenantCompanyId: bigint;
    query: string;
    limit?: number;
  },
): Promise<Array<{ id: string; source_id: string; rank: number }>> {
  const limit = Math.min(Math.max(params.limit ?? 8, 1), 64);
  const tid = params.tenantCompanyId;
  const q = params.query.trim().slice(0, 4000);
  if (!q) return [];

  return runHybridRetrievalSession(prisma, async (tx) => {
    return tx.$queryRawUnsafe<Array<{ id: string; source_id: string; rank: number }>>(
      `
      SELECT id, source_id, ts_rank_cd(content_tsv, plainto_tsquery('english', $1))::float8 AS rank
      FROM agent13_hybrid_chunk
      WHERE tenant_company_id = $2
        AND content_tsv @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT $3
      `,
      q,
      tid,
      limit,
    );
  });
}
