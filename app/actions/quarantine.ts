'use server';

import { PrismaClient } from '@prisma/client-dmz';

const prismaDmz = new PrismaClient();

export async function logToQuarantine(fileName: string, tenantId: string = 'medshield') {
  try {
    const record = await prismaDmz.quarantineRecord.create({
      data: {
        fileName: fileName,
        tenantId: tenantId,
        status: 'PENDING',
        fileSize: 0,
        storagePath: 'pending/',
        uploadedBy: 'SYSTEM',
      },
    });
    return { success: true, record };
  } catch (error) {
    console.error('[DMZ_ERROR] Failed to quarantine:', error);
    return { success: false };
  }
}