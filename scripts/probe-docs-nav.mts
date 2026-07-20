/**
 * Probe every AppDocument nav href against local Core.
 * Fails if status >= 400 or TTFB > BUDGET_MS.
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.DOCS_PROBE_BASE?.trim() || "http://127.0.0.1:3000";
const BUDGET_MS = Number(process.env.DOCS_PROBE_BUDGET_MS ?? 3000);
const CONCURRENCY = 6;

const prisma = new PrismaClient();

type ProbeResult = {
  href: string;
  status: number;
  ms: number;
  ok: boolean;
};

async function probe(href: string): Promise<ProbeResult> {
  const url = `${BASE}${href}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { Accept: "text/html" },
    });
    const ms = Date.now() - started;
    // Consume body so connection can close promptly
    await res.arrayBuffer();
    const ok = res.status >= 200 && res.status < 400 && ms <= BUDGET_MS;
    return { href, status: res.status, ms, ok };
  } catch (error) {
    return {
      href,
      status: 0,
      ms: Date.now() - started,
      ok: false,
    };
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

async function main() {
  const rows = await prisma.appDocument.findMany({
    select: { slug: true },
    orderBy: { slug: "asc" },
  });

  const hrefs = [
    "/docs",
    "/docs/README",
    ...rows.map((row) =>
      row.slug === "readme" ? "/docs/README" : `/docs/${row.slug}`,
    ),
  ];
  const unique = [...new Set(hrefs)];

  console.log(`[docs-nav-probe] base=${BASE} budget=${BUDGET_MS}ms links=${unique.length}`);

  const warm = await probe("/docs/README");
  console.log(`[docs-nav-probe] warm-up README status=${warm.status} ${warm.ms}ms`);

  const results = await mapPool(unique, CONCURRENCY, probe);
  const fails = results.filter((r) => !r.ok);
  const slow = results.filter((r) => r.ms > BUDGET_MS);
  const badStatus = results.filter((r) => r.status < 200 || r.status >= 400);

  const sorted = [...results].sort((a, b) => b.ms - a.ms);
  console.log("[docs-nav-probe] slowest 10:");
  for (const row of sorted.slice(0, 10)) {
    console.log(`  ${row.ms}ms  HTTP ${row.status}  ${row.href}`);
  }

  console.log(
    `[docs-nav-probe] ok=${results.length - fails.length} fail=${fails.length} slow=${slow.length} badStatus=${badStatus.length}`,
  );

  if (fails.length) {
    console.error("[docs-nav-probe] FAILURES:");
    for (const row of fails) {
      console.error(`  ${row.ms}ms  HTTP ${row.status}  ${row.href}`);
    }
    process.exitCode = 1;
  } else {
    console.log("[docs-nav-probe] All nav links returned <400 within budget.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
