import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaClient as IronPrisma } from "@prisma/client";

const salesClientPath = resolve(
  process.cwd(),
  "SalesTeam/generated/client/index.js",
);
const { PrismaClient: SalesPrisma } = await import(
  pathToFileURL(salesClientPath).href
);

const iron = new IronPrisma();
const salesDb = resolve(process.cwd(), "SalesTeam/data/salesteam.db").replace(
  /\\/g,
  "/",
);
const sales = new SalesPrisma({
  datasources: { db: { url: `file:${salesDb}` } },
});

try {
  const processed = await sales.processedDeal.findMany({
    orderBy: { processedAt: "desc" },
    take: 20,
  });
  console.log(
    "processedDeals:",
    JSON.stringify(
      processed.map((p) => ({
        dealId: p.ironframeDealId,
        status: p.status,
        channel: p.channel,
        error: p.errorMessage,
        interactionId: p.interactionId,
        processedAt: p.processedAt,
      })),
      null,
      2,
    ),
  );

  const tenant = await iron.tenant.findUnique({
    where: { slug: "prospect-pool" },
    select: { id: true },
  });
  const interactions = tenant
    ? await iron.ironboardCrmInteraction.findMany({
        where: {
          tenantId: tenant.id,
          summary: { contains: "[PENDING SALES DRAFT APPROVAL]" },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          channel: true,
          summary: true,
          dealId: true,
          contactId: true,
          createdAt: true,
        },
      })
    : [];

  console.log(
    "pendingSalesDrafts:",
    JSON.stringify(
      interactions.map((i) => ({
        id: i.id,
        channel: i.channel,
        dealId: i.dealId,
        createdAt: i.createdAt,
        summaryHead: i.summary.slice(0, 200),
      })),
      null,
      2,
    ),
  );
} finally {
  await iron.$disconnect();
  await sales.$disconnect();
}
