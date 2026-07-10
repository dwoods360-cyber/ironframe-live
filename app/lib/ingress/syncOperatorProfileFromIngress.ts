import prisma from "@/lib/prisma";
import type { OperatorProfileIngressPayload } from "@/app/lib/ingress/operatorProfileIngressSchema";

export type SyncOperatorProfileResult = {
  operatorId: string;
  created: boolean;
};

export async function syncOperatorProfileFromIngress(
  operatorId: string,
  payload: OperatorProfileIngressPayload,
): Promise<SyncOperatorProfileResult> {
  const data = {
    title: payload.title ?? null,
    phone: payload.phone ?? null,
    avatarUrl: payload.avatarUrl ?? null,
  };

  const existing = await prisma.operatorProfile.findUnique({
    where: { id: operatorId },
    select: { id: true },
  });

  await prisma.operatorProfile.upsert({
    where: { id: operatorId },
    create: { id: operatorId, ...data },
    update: data,
  });

  return { operatorId, created: !existing };
}
