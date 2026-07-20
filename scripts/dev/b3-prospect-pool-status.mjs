import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const slug = process.argv[2] || "prospect-pool";

try {
  const t = await p.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
  console.log("tenant:", t);
  if (!t) process.exit(2);

  const deals = await p.ironboardCrmDeal.count({ where: { tenantId: t.id } });
  const contacts = await p.ironboardCrmContact.count({
    where: { tenantId: t.id },
  });
  const suspects = await p.ironboardCrmDeal.findMany({
    where: { tenantId: t.id, stage: "SUSPECT" },
    take: 25,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      accountDomain: true,
      stage: true,
      updatedAt: true,
      primaryContact: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          company: true,
          priorityScore: true,
          detectedTrigger: true,
        },
      },
    },
  });

  const withReachable = suspects.filter((s) => {
    const email = s.primaryContact?.email || "";
    const phone = s.primaryContact?.phone || "";
    const fakeLocal = /@ironleads\.local$/i.test(email);
    return (Boolean(email) && !fakeLocal) || Boolean(phone);
  });

  console.log(
    JSON.stringify(
      {
        deals,
        contacts,
        suspectCount: suspects.length,
        reachableEmailOrPhone: withReachable.length,
        suspects: suspects.map((s) => ({
          dealId: s.id,
          company: s.primaryContact?.company,
          email: s.primaryContact?.email,
          phone: s.primaryContact?.phone,
          domain: s.accountDomain,
          trigger: s.primaryContact?.detectedTrigger,
          score: s.primaryContact?.priorityScore,
        })),
      },
      null,
      2,
    ),
  );
} finally {
  await p.$disconnect();
}
