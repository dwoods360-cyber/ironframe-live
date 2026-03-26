'use server';

import prisma from '@/lib/prisma';
import { resolveTenantUuidFromSlugOrUuid } from '@/app/utils/serverTenantContext';

export async function uploadToQuarantine(formData: FormData, tenantId: string) {
  const file = formData.get('file') as File | null;
  if (!file) throw new Error('No file provided');

  try {
    const tenantUuid = resolveTenantUuidFromSlugOrUuid(tenantId);
    const storagePath = `${tenantUuid}/dmz/${Date.now()}-${file.name}`;

    const record = await prisma.quarantineRecord.create({
      data: {
        tenantId: tenantUuid,
        fileName: file.name,
        fileSize: file.size,
        storagePath,
        uploadedBy: 'J. DOE (CISO)',
      },
    });

    return { success: true, record };
  } catch (error) {
    console.error('Upload failed:', error);
    return { success: false, error: 'Failed to write quarantine record' };
  }
}
