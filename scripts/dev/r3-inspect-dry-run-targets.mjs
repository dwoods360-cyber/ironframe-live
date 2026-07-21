import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const ids = [
  "8f312d48-1e06-4945-b8ff-f0733dd2ee64",
  "c9b60105-165b-4579-a2cd-0ba88948a2e7",
];

for (const id of ids) {
  const row = await p.ironboardCrmInteraction.findUnique({
    where: { id },
    select: {
      id: true,
      channel: true,
      tenantId: true,
      summary: true,
      contact: { select: { id: true, email: true, phone: true, fullName: true } },
      deal: { select: { id: true, title: true } },
    },
  });
  const summary = row?.summary ?? "";
  console.log(
    JSON.stringify(
      {
        id: row?.id,
        channel: row?.channel,
        company: row?.deal?.title,
        contact: row?.contact,
        smsHints: {
          executionSourceSms: /Execution Source:.*\bSMS\b/i.test(summary),
          channelSms: /\bChannel:SMS\b/i.test(summary),
          localEmail: /@ironleads\.local/i.test(summary),
        },
      },
      null,
      2,
    ),
  );
}

await p.$disconnect();
