import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { updatePendingSalesDraftOnly } from "../../app/lib/salesDraftWriteGuard.ts";

config({ path: resolve(process.cwd(), ".env.local"), override: true });
const prisma = new PrismaClient();

const blocked = await updatePendingSalesDraftOnly(prisma, {
  id: "9a991af7-8cc9-4e4a-8bdb-fca57b832339", // Appalachia DISPATCHED
  summary: "[PENDING SALES DRAFT APPROVAL] should never write",
});

const assura = await prisma.ironboardCrmInteraction.findUnique({
  where: { id: "4dd5ae31-2cd8-442c-9278-55be06b6d74d" },
  select: { summary: true },
});
const pendingKeep = await updatePendingSalesDraftOnly(prisma, {
  id: "4dd5ae31-2cd8-442c-9278-55be06b6d74d",
  summary: assura?.summary || "",
});

console.log(
  JSON.stringify(
    {
      blocked,
      pendingKeep: { ok: pendingKeep.ok, updated: pendingKeep.updated },
    },
    null,
    2,
  ),
);
await prisma.$disconnect();
