'use server';

import prisma from '@/lib/prisma';
import { resolveTenantUuidFromSlugOrUuid } from '@/app/utils/serverTenantContext';

export async function logToQuarantine(fileName: string, tenantId: string = 'medshield') {
  try {
    const tenantUuid = resolveTenantUuidFromSlugOrUuid(tenantId);
    const record = await prisma.quarantineRecord.create({
      data: {
        fileName: fileName,
        tenantId: tenantUuid,
        status: 'PENDING',
        fileSize: 0,
        storagePath: 'pending/',
        uploadedBy: 'SYSTEM',
      },
    });
    return { success: true, record };
  } catch (error) {
    console.error('[QUARANTINE_ERROR] Failed to persist:', error);
    return { success: false };
  }
}
