import prisma from "@/lib/prisma";
import type { TenantContactProfileIngressPayload } from "@/app/lib/ingress/tenantContactProfileIngressSchema";

export type SyncTenantContactProfileResult = {
  tenantId: string;
  created: boolean;
};

export async function syncTenantContactProfileFromIngress(
  tenantId: string,
  payload: TenantContactProfileIngressPayload,
): Promise<SyncTenantContactProfileResult> {
  const data = {
    corporatePhone: payload.corporatePhone ?? null,
    addressStreet: payload.addressStreet ?? null,
    addressCity: payload.addressCity ?? null,
    addressState: payload.addressState ?? null,
    addressZip: payload.addressZip ?? null,
    addressCountry: payload.addressCountry ?? null,
    billingContactEmail: payload.billingContactEmail ?? null,
    taxId: payload.taxId ?? null,
  };

  const existing = await prisma.tenantContactProfile.findUnique({
    where: { tenantId },
    select: { tenantId: true },
  });

  await prisma.tenantContactProfile.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  });

  return { tenantId, created: !existing };
}
