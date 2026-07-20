import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.opsActivity.findMany({ orderBy: { dueAt: "asc" } });
  for (const r of rows) {
    const hrefRows = await prisma.$queryRaw<Array<{ href: string | null }>>`
      SELECT href FROM ops_activities WHERE id = ${r.id} LIMIT 1
    `;
    const href = (hrefRows[0]?.href ?? "").trim();
    console.log(
      `${r.dueAt.toISOString().slice(0, 10)} | ${r.status.padEnd(12)} | ${r.kind.padEnd(22)} | ${r.title}`,
    );
    console.log(`             ${(r.notes ?? "").trim() || "[MISSING SYNOPSIS]"}`);
    console.log(`             ${href || "[MISSING HREF]"}`);
  }
  console.log(`TOTAL ${rows.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
