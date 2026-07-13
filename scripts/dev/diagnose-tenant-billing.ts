/**
 * Print tenant + billing snapshot for a workspace slug.
 *
 * Usage: npx tsx scripts/dev/diagnose-tenant-billing.ts --slug your-workspace
 */
import { config } from "dotenv";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

function readArg(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1]?.trim() || null;
}

const slug = readArg("--slug")?.trim().toLowerCase() ?? "";

async function main(): Promise<void> {
  if (!slug || slug.length < 2) {
    throw new Error("--slug is required (e.g. --slug acmecorp)");
  }

  const prisma = new PrismaClient();
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, ale_baseline: true },
    });
    const billing = await prisma.tenantBilling.findUnique({
      where: { tenantSlug: slug },
    });
    const company = tenant
      ? await prisma.company.findFirst({
          where: { tenantId: tenant.id, isTestRecord: false },
          select: { id: true, name: true },
        })
      : null;

    const audit = tenant
      ? await prisma.auditLog.findMany({
          where: { tenantId: tenant.id },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { action: true, justification: true, createdAt: true },
        })
      : [];

    console.log("slug:", slug);
    console.log("tenant:", tenant);
    console.log("billing:", billing);
    console.log("primaryCompany:", company);
    console.log("recentAudit:", audit);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
