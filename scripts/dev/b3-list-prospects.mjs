import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const slug = process.argv[2] || "prospect-pool";

try {
  const t = await p.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });
  if (!t) {
    console.error("tenant missing:", slug);
    process.exit(2);
  }
  const rows = await p.ironboardCrmDeal.findMany({
    where: { tenantId: t.id },
    orderBy: { updatedAt: "desc" },
    include: {
      primaryContact: {
        select: {
          company: true,
          email: true,
          phone: true,
          detectedTrigger: true,
          priorityScore: true,
        },
      },
    },
  });
  const mapped = rows.map((r) => {
    const email = r.primaryContact.email || "";
    const phone = r.primaryContact.phone || "";
    const reachable =
      Boolean(phone) || (Boolean(email) && !/@ironleads\.local$/i.test(email));
    return {
      stage: r.stage,
      company: r.primaryContact.company,
      phone,
      email,
      trigger: r.primaryContact.detectedTrigger,
      domain: r.accountDomain,
      score: r.primaryContact.priorityScore,
      reachable,
      dealId: r.id,
    };
  });
  console.log(
    JSON.stringify(
      {
        slug,
        total: mapped.length,
        prospectReachable: mapped.filter(
          (m) => m.stage === "PROSPECT" && m.reachable,
        ).length,
        rows: mapped,
      },
      null,
      2,
    ),
  );
} finally {
  await p.$disconnect();
}
