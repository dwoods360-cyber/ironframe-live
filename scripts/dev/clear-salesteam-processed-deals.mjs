/**
 * Clear SalesTeam processedDeal rows using the worker's own Prisma client / DB URL.
 * Run from repo root: npx tsx scripts/dev/clear-salesteam-processed-deals.mjs [dealId...]
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "dotenv";

const dealIds = process.argv.slice(2);
const salesRoot = resolve(process.cwd(), "SalesTeam");

config({ path: resolve(salesRoot, ".env"), override: true });
config({ path: resolve(process.cwd(), ".env.local"), override: false });

if (dealIds.length === 0) {
  console.error("Usage: clear-salesteam-processed-deals.mjs <dealId>...");
  process.exit(1);
}

// Relative file:./data/salesteam.db must resolve from SalesTeam/
process.chdir(salesRoot);
if (!process.env.SALESTEAM_DATABASE_URL) {
  process.env.SALESTEAM_DATABASE_URL = "file:./data/salesteam.db";
}

const salesClientPath = resolve(salesRoot, "generated/client/index.js");
const { PrismaClient } = await import(pathToFileURL(salesClientPath).href);
const sales = new PrismaClient();

try {
  const all = await sales.processedDeal.findMany({
    orderBy: { processedAt: "desc" },
    take: 50,
  });
  const before = await sales.processedDeal.findMany({
    where: { ironframeDealId: { in: dealIds } },
  });
  const del = await sales.processedDeal.deleteMany({
    where: { ironframeDealId: { in: dealIds } },
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        cwd: process.cwd(),
        databaseUrl: process.env.SALESTEAM_DATABASE_URL
          ? String(process.env.SALESTEAM_DATABASE_URL).replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@")
          : "(default)",
        recentAll: all.map((p) => ({
          dealId: p.ironframeDealId,
          status: p.status,
          processedAt: p.processedAt,
        })),
        matched: before.length,
        deleted: del.count,
      },
      null,
      2,
    ),
  );
} finally {
  await sales.$disconnect();
}
