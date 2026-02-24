'use server';

import { PrismaClient } from '@prisma/client-dmz';

const prismaDmz = new PrismaClient();

export async function uploadToQuarantine(formData: FormData, tenantId: string) {
  const file = formData.get('file') as File | null;
  if (!file) throw new Error('No file provided');

  try {
    const storagePath = `${tenantId}/dmz/${Date.now()}-${file.name}`;

    const record = await prismaDmz.quarantineRecord.create({
      data: {
        tenantId,
        fileName: file.name,
        fileSize: file.size,
        storagePath,
        uploadedBy: 'J. DOE (CISO)',
      },
    });

    return { success: true, record };
  } catch (error) {
    console.error('Upload failed:', error);
    return { success: false, error: 'Failed to write to DMZ' };
  }
}