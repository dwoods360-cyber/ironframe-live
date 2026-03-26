'use server';

import prisma from '@/lib/prisma';

/**
 * Universal audit logger: records every action taken on a threat card for the Audit Intelligence stream.
 * Does not throw; logs errors to console.
 */
export async function logThreatActivity(
  threatId: string,
  actionName: string,
  details: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: actionName,
        justification: details,
        operatorId: 'THREAT_ACTIVITY',
        threatId,
        isSimulation: false,
      },
    });
  } catch (error) {
    console.error('[AUDIT_LOG_ERROR] Failed to record activity:', error);
  }
}
