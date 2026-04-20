import prisma from "@/lib/prisma";
import type { DigitalReceiptAuditStub } from "@/app/lib/grc/threatReceipt";

export async function loadAuditTailForDigitalReceipt(
  mode: "sim" | "prod",
  threatId: string,
): Promise<DigitalReceiptAuditStub[]> {
  const rows =
    mode === "prod"
      ? await prisma.auditLog.findMany({
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
      : await prisma.auditLog.findMany({
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
