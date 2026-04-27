'use server';

import prisma from '@/lib/prisma';
import { resolveTenantUuidFromSlugOrUuid } from '@/app/utils/serverTenantContext';
import { getSupabaseSessionUser } from '@/app/utils/serverAuth';

export async function uploadToQuarantine(formData: FormData, tenantId: string) {
  const file = formData.get('file') as File | null;
  if (!file) throw new Error('No file provided');

  try {
    const tenantUuid = resolveTenantUuidFromSlugOrUuid(tenantId);
    const storagePath = `${tenantUuid}/dmz/${Date.now()}-${file.name}`;
    const sessionUser = await getSupabaseSessionUser();
    const uploadedBy =
      (typeof sessionUser?.user_metadata?.full_name === 'string' &&
        sessionUser.user_metadata.full_name.trim()) ||
      sessionUser?.email?.trim() ||
      'SYSTEM_UPLOAD';

    const record = await prisma.quarantineRecord.create({
      data: {
        tenantId: tenantUuid,
        fileName: file.name,
        fileSize: file.size,
        storagePath,
        uploadedBy,
      },
    });

    return { success: true, record };
  } catch (error) {
    console.error('Upload failed:', error);
    return { success: false, error: 'Failed to write quarantine record' };
  }
}
