import prisma from '@/lib/prisma';
import type { CompanyProfileIngressPayload } from '@/app/lib/ingress/companyProfileIngressSchema';

export type SyncCompanyProfileResult = {
  companyId: bigint;
  created: boolean;
  departmentsSynced: number;
};

/**
 * Upserts the primary non-test company row for a tenant (first match by id asc).
 * Prisma has no unique on tenantId — application law enforces one primary profile.
 */
export async function syncCompanyProfileFromIngress(
  tenantId: string,
  payload: CompanyProfileIngressPayload,
): Promise<SyncCompanyProfileResult> {
  const industryAvgLoss_cents =
    payload.industryAvgLossCents != null ? BigInt(payload.industryAvgLossCents) : null;

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!tenant) {
      throw new Error('TENANT_NOT_FOUND');
    }

    const existing = await tx.company.findFirst({
      where: { tenantId, isTestRecord: false },
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    const company = existing
      ? await tx.company.update({
          where: { id: existing.id },
          data: {
            name: payload.companyName,
            sector: payload.sector,
            industry_avg_loss_cents: industryAvgLoss_cents,
          },
        })
      : await tx.company.create({
          data: {
            tenantId,
            name: payload.companyName,
            sector: payload.sector,
            industry_avg_loss_cents: industryAvgLoss_cents,
            isTestRecord: false,
          },
        });

    let departmentsSynced = 0;
    if (payload.departments && payload.departments.length > 0) {
      await tx.department.deleteMany({ where: { company_id: company.id } });
      await tx.department.createMany({
        data: payload.departments.map((name) => ({
          company_id: company.id,
          name,
        })),
      });
      departmentsSynced = payload.departments.length;
    }

    return {
      companyId: company.id,
      created: !existing,
      departmentsSynced,
    };
  });
}
