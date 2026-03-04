'use server';

import prismaDmz from '@/lib/prisma-dmz';

/**
 * Universal audit logger: records every action taken on a threat card in the DMZ database
 * for the Audit Intelligence stream. Does not throw; logs errors to console.
 */
export async function logThreatActivity(
  threatId: string,
  actionName: string,
  details: string,
): Promise<void> {
  try {
    await prismaDmz.threatActivityLog.create({
      data: {
        threatId,
        action: actionName,
        details,
      },
    });
  } catch (error) {
    console.error('[AUDIT_LOG_ERROR] Failed to record activity:', error);
  }
}
