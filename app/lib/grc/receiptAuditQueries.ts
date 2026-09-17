import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { DigitalReceiptAuditStub } from "@/app/lib/grc/threatReceipt";

type ReceiptAuditDb = Pick<Prisma.TransactionClient, "auditLog">;

export async function loadAuditTailForDigitalReceipt(
  mode: "sim" | "prod",
  threatId: string,
  db?: ReceiptAuditDb,
): Promise<DigitalReceiptAuditStub[]> {
  const client = db ?? prisma;
  const rows =
    mode === "prod"
      ? await client.auditLog.findMany({
          where: { threatId },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: {
            id: true,
            action: true,
            operatorId: true,
            createdAt: true,
            justification: true,
            isSimulation: true,
          },
        })
      : await client.auditLog.findMany({
          where: {
            isSimulation: true,
            justification: { contains: `"simThreatId":"${threatId}"` },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: {
            id: true,
            action: true,
            operatorId: true,
            createdAt: true,
            justification: true,
            isSimulation: true,
          },
        });
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    operatorId: r.operatorId,
    createdAt: r.createdAt.toISOString(),
    isSimulation: r.isSimulation,
    justificationPreview: r.justification ? r.justification.slice(0, 2400) : null,
  }));
}
