import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const published = await prisma.publishedBriefing.findMany({
    where: {
      OR: [
        { slug: { contains: "austrac", mode: "insensitive" } },
        { title: { contains: "AUSTRAC", mode: "insensitive" } },
        { slug: { contains: "tranche", mode: "insensitive" } },
      ],
    },
    select: { slug: true, title: true, publishedAt: true },
  });
  const denials = await prisma.$queryRaw<
    Array<{ filename: string; reason: string | null; denied_by: string; created_at: Date }>
  >`
    SELECT filename, reason, denied_by, created_at
    FROM briefing_queue_denials
    WHERE filename ILIKE '%austrac%' OR filename ILIKE '%tranche%'
  `;
  console.log(JSON.stringify({ published, denials }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
