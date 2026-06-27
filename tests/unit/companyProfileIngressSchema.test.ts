/**
 * Company profile ingress schema — tenant org graph validation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  COMPANY_PROFILE_SCHEMA_VERSION,
  companyProfileIngressSchema,
} from '@/app/lib/ingress/companyProfileIngressSchema';

const TENANT = '5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01';

const GOLDEN = {
  schemaVersion: COMPANY_PROFILE_SCHEMA_VERSION,
  tenantId: TENANT,
  companyName: 'Acme Aerospace Holdings',
  sector: 'Defense and Critical Infrastructure',
  industryAvgLossCents: '1250000000',
  departments: ['SecOps', 'Flight Operations', 'Core Infrastructure', 'Legal Compliance'],
};

describe('companyProfileIngressSchema', () => {
  it('golden path: valid company profile payload passes', () => {
    const result = companyProfileIngressSchema.safeParse(GOLDEN);
    expect(result.success).toBe(true);
  });

  it('rejects decimal industryAvgLossCents', () => {
    const result = companyProfileIngressSchema.safeParse({
      ...GOLDEN,
      industryAvgLossCents: '1250.50',
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate department names', () => {
    const result = companyProfileIngressSchema.safeParse({
      ...GOLDEN,
      departments: ['SecOps', 'secops'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid schemaVersion', () => {
    const result = companyProfileIngressSchema.safeParse({
      ...GOLDEN,
      schemaVersion: 'company-profile-v0',
    });
    expect(result.success).toBe(false);
  });
});

vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: vi.fn(),
    tenant: { findUnique: vi.fn() },
    company: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    department: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
}));

import prisma from '@/lib/prisma';
import { syncCompanyProfileFromIngress } from '@/app/lib/ingress/syncCompanyProfileFromIngress';

describe('syncCompanyProfileFromIngress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates company when none exists for tenant', async () => {
    const tx = {
      tenant: { findUnique: vi.fn().mockResolvedValue({ id: TENANT }) },
      company: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: 99n,
          tenantId: TENANT,
          name: GOLDEN.companyName,
          sector: GOLDEN.sector,
        }),
        update: vi.fn(),
      },
      department: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 4 }),
      },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) =>
      fn(tx as never),
    );

    const parsed = companyProfileIngressSchema.parse(GOLDEN);
    const result = await syncCompanyProfileFromIngress(TENANT, parsed);

    expect(result.created).toBe(true);
    expect(result.companyId).toBe(99n);
    expect(result.departmentsSynced).toBe(4);
    expect(tx.company.create).toHaveBeenCalled();
  });

  it('updates existing primary company for tenant', async () => {
    const tx = {
      tenant: { findUnique: vi.fn().mockResolvedValue({ id: TENANT }) },
      company: {
        findFirst: vi.fn().mockResolvedValue({ id: 12n }),
        update: vi.fn().mockResolvedValue({
          id: 12n,
          tenantId: TENANT,
          name: GOLDEN.companyName,
          sector: GOLDEN.sector,
        }),
        create: vi.fn(),
      },
      department: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) =>
      fn(tx as never),
    );

    const parsed = companyProfileIngressSchema.parse({
      ...GOLDEN,
      departments: undefined,
    });
    const result = await syncCompanyProfileFromIngress(TENANT, parsed);

    expect(result.created).toBe(false);
    expect(result.companyId).toBe(12n);
    expect(result.departmentsSynced).toBe(0);
    expect(tx.company.update).toHaveBeenCalled();
    expect(tx.department.deleteMany).not.toHaveBeenCalled();
  });
});
