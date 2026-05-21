import { Prisma, type PrismaClient } from "@prisma/client";

/**
 * Session-scoped planner hints for hybrid retrieval + large sequential/bitmap scans.
 *
 * PostgreSQL 18 AIO (`io_method` / `io_workers`) is configured on the **server**; it accelerates buffer reads
 * under the planner’s parallel and bitmap paths. Here we avoid single-gather bottlenecks and enable
 * partition-wise plans when hitting HASH-partitioned corpus tables — complementary to AIO, not a substitute.
 */
const HYBRID_RETRIEVAL_SESSION_SQL = `
  SET LOCAL max_parallel_workers_per_gather = 4;
  SET LOCAL enable_partitionwise_join = on;
  SET LOCAL enable_partitionwise_aggregate = on;
  SET LOCAL parallel_tuple_cost = 0.01;
  SET LOCAL parallel_setup_cost = 100;
  SET LOCAL min_parallel_table_scan_size = 8;
  SET LOCAL effective_io_concurrency = 200;
`;

export async function runHybridRetrievalSession<T>(
  prisma: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { timeoutMs?: number },
): Promise<T> {
  const timeout = options?.timeoutMs ?? 60_000;
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(HYBRID_RETRIEVAL_SESSION_SQL);
      return fn(tx);
    },
    { timeout, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}
