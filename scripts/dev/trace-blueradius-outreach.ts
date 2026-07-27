/**
 * Trace BlueRadius Cyber outreach in production CRM + approval interactions.
 * Usage: npx vercel env run -e production -- npx tsx scripts/dev/trace-blueradius-outreach.ts
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

const COMPANY = "BlueRadius";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is not set");
  }
  const prisma = new PrismaClient();
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: "prospect-pool" },
      select: { id: true, slug: true },
    });
    if (!tenant) {
      console.log(JSON.stringify({ ok: false, error: "prospect-pool tenant missing" }));
      return;
    }

    const contacts = await prisma.ironboardCrmContact.findMany({
      where: {
        tenantId: tenant.id,
        OR: [
          { company: { contains: COMPANY, mode: "insensitive" } },
          { email: { contains: "blueradius", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        company: true,
        email: true,
        phone: true,
        detectedTrigger: true,
        priorityScore: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const deals = await prisma.ironboardCrmDeal.findMany({
      where: {
        tenantId: tenant.id,
        OR: [
          { accountDomain: { contains: "blueradius", mode: "insensitive" } },
          { primaryContact: { company: { contains: COMPANY, mode: "insensitive" } } },
        ],
      },
      include: {
        primaryContact: {
          select: { id: true, company: true, email: true, phone: true, detectedTrigger: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const dealIds = deals.map((d) => d.id);
    const contactIds = [
      ...new Set([
        ...contacts.map((c) => c.id),
        ...deals.map((d) => d.primaryContactId).filter(Boolean),
      ]),
    ] as string[];

    const interactions = await prisma.ironboardCrmInteraction.findMany({
      where: {
        tenantId: tenant.id,
        OR: [
          ...(dealIds.length ? [{ dealId: { in: dealIds } }] : []),
          ...(contactIds.length ? [{ contactId: { in: contactIds } }] : []),
          { summary: { contains: "BlueRadius", mode: "insensitive" } },
          { summary: { contains: "blueradius", mode: "insensitive" } },
          { summary: { contains: "DISPATCHED SALES", mode: "insensitive" } },
        ],
      },
      orderBy: { occurredAt: "asc" },
      select: {
        id: true,
        channel: true,
        summary: true,
        dealId: true,
        contactId: true,
        occurredAt: true,
        createdAt: true,
      },
      take: 60,
    });

    const opsTouches = await prisma.opsActivity.findMany({
      where: {
        OR: [
          { title: { contains: COMPANY, mode: "insensitive" } },
          { notes: { contains: "BlueRadius", mode: "insensitive" } },
          { outcome: { contains: "BlueRadius", mode: "insensitive" } },
          { notes: { contains: "blueradius", mode: "insensitive" } },
          { sourceRef: { contains: "blueradius", mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 40,
    });

    const agentLogs = await prisma.agentLog
      .findMany({
        where: {
          OR: [
            { message: { contains: "BlueRadius", mode: "insensitive" } },
            { message: { contains: "blueradius", mode: "insensitive" } },
            { message: { contains: "1a7a80e4-0f0a-4286-90c1-f68e348366ad", mode: "insensitive" } },
            { message: { contains: "78d55ab1-f57b-4c12-972a-0903eca11c06", mode: "insensitive" } },
          ],
        },
        orderBy: { timestamp: "asc" },
        take: 20,
        select: { id: true, message: true, timestamp: true, tenantId: true },
      })
      .catch(() => []);

    // Approvals drafts may live on Gridcore / other tenants, not only prospect-pool.
    const crossTenantInteractions = await prisma.ironboardCrmInteraction.findMany({
      where: {
        OR: [
          { summary: { contains: "BlueRadius", mode: "insensitive" } },
          { summary: { contains: "blueradius", mode: "insensitive" } },
          { summary: { contains: "1a7a80e4-0f0a-4286-90c1-f68e348366ad", mode: "insensitive" } },
          { summary: { contains: "78d55ab1-f57b-4c12-972a-0903eca11c06", mode: "insensitive" } },
        ],
      },
      orderBy: { occurredAt: "asc" },
      take: 80,
      select: {
        id: true,
        tenantId: true,
        channel: true,
        summary: true,
        dealId: true,
        contactId: true,
        occurredAt: true,
        createdAt: true,
      },
    });

    const allInteractionRows = [
      ...interactions,
      ...crossTenantInteractions.filter((r) => !interactions.some((i) => i.id === r.id)),
    ];

    const summarizedInteractions = allInteractionRows.map((row) => {
      const body = row.summary ?? "";
      const dispatched = /DISPATCHED SALES COURIER/i.test(body);
      const pending = /PENDING SALES DRAFT APPROVAL/i.test(body);
      const purged = /PURGED DRAFT/i.test(body);
      const toMatch =
        body.match(/To:\s*([^\s|]+)/i) ||
        body.match(/Channel:\s*EMAIL\s*\|\s*To:\s*([^\s|]+)/i);
      const resendMatch = body.match(/Resend Message ID:\s*([a-f0-9-]+)/i);
      const originalMatch = body.match(/Original Log Ref:\s*([a-f0-9-]+)/i);
      return {
        id: row.id,
        tenantId: "tenantId" in row ? (row as { tenantId?: string }).tenantId : tenant.id,
        channel: row.channel,
        dealId: row.dealId,
        occurredAt: row.occurredAt,
        createdAt: row.createdAt,
        state: purged ? "PURGED" : dispatched ? "DISPATCHED" : pending ? "PENDING" : "OTHER",
        inferredTo: toMatch?.[1] ?? null,
        resendMessageId: resendMatch?.[1] ?? null,
        originalLogRef: originalMatch?.[1] ?? null,
        summaryPreview: body.slice(0, 500).replace(/\s+/g, " "),
      };
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          tenant,
          contacts,
          deals: deals.map((d) => ({
            id: d.id,
            title: d.title,
            stage: d.stage,
            accountDomain: d.accountDomain,
            notes: d.notes?.slice(0, 240),
            updatedAt: d.updatedAt,
            contact: d.primaryContact,
          })),
          interactions: summarizedInteractions,
          opsTouches: opsTouches.map((o) => ({
            id: o.id,
            kind: o.kind,
            status: o.status,
            title: o.title,
            sourceRef: o.sourceRef,
            createdAt: o.createdAt,
            completedAt: o.completedAt,
            notesPreview: String((o as { notes?: string | null }).notes ?? "").slice(0, 240),
            outcomePreview: String((o as { outcome?: string | null }).outcome ?? "").slice(0, 240),
          })),
          agentLogHits: agentLogs,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
