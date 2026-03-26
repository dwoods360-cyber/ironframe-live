'use server';

import { revalidatePath } from 'next/cache';
import prisma from "@/lib/prisma";
import { ThreatState, DeAckReason } from '@prisma/client';
import { sendThreatConfirmationEmail, routeRiskNotification, sendRiskNotification } from '@/app/actions/email';
import { logThreatActivity } from '@/app/actions/auditActions';
import { grcGatePass, getGrcThresholdCents } from '@/app/utils/grcGate';
import { workNoteSchema } from '@/app/utils/irongateSchema';
const prismaDelegates = prisma as unknown as {
  threatEvent?: {
    findUnique: (args: unknown) => Promise<{ id: string } | null>;
    update: (args: unknown) => Promise<any>;
  };
  auditLog?: {
    create: (args: unknown) => Promise<any>;
  };
  workNote?: {
    create: (args: unknown) => Promise<any>;
  };
};

const AUDIT_LOG_FAILURE =
  'AUDIT_LOG_FAILURE: Cannot log action for non-existent Threat ID.';

/** Explicit GRC notification recipient; use verified Gmail to avoid Zoho 550. */
const targetEmail = 'dwoods360@gmail.com'.trim();

type SecurityBriefThreat = {
  title: string;
  id: string;
  financialRisk_cents: bigint;
  affectedSystem?: string;
  detectingAgent?: string;
};

const CENTS_PER_MILLION = 100_000_000;

function centsToMillions(value: bigint | number | null | undefined): number {
  return Number(value ?? 0) / CENTS_PER_MILLION;
}

/** Dynamic email template: professional security brief with action-type color (CONFIRMED = orange, RESOLVED = green). */
function generateSecurityBrief(threat: SecurityBriefThreat, actionType: 'CONFIRMED' | 'RESOLVED'): string {
  const color = actionType === 'RESOLVED' ? '#16a34a' : '#ea580c';
  const liability = centsToMillions(threat.financialRisk_cents);
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="background-color: #1e3a8a; color: #ffffff; padding: 25px 20px; text-align: center;">
      <h2 style="margin: 0; font-size: 22px; letter-spacing: 2px;">IRONFRAME GRC</h2>
      <p style="margin: 5px 0 0; color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Automated Security Brief</p>
    </div>

    <div style="padding: 30px 20px; background-color: #f8fafc;">
      <h3 style="color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-top: 0;">
        Threat Status: <span style="color: ${color};">${actionType}</span>
      </h3>
      <p style="color: #334155; font-size: 16px; line-height: 1.5;">The following risk profile has been updated in the GRC matrix.</p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 25px; margin-bottom: 25px;">
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9; width: 35%; color: #475569;">Threat Title</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #ffffff; color: #0f172a;">${threat.title}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9; color: #475569;">Tracking ID</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #ffffff; font-family: monospace; color: #64748b;">${threat.id}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9; color: #475569;">Affected System</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #ffffff; color: #0f172a;">${threat.affectedSystem ?? 'Core Infrastructure'}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9; color: #475569;">Detecting Agent</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #ffffff; color: #0f172a;">${threat.detectingAgent ?? 'GRCBOT / CoreIntel'}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9; color: #475569;">Financial Liability</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #ffffff; color: #b91c1c; font-weight: bold;">$${liability}M</td>
        </tr>
      </table>

      <div style="text-align: center; margin-top: 35px; margin-bottom: 10px;">
        <a href="http://localhost:3000/threats/${threat.id}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 15px;">Review in Dashboard</a>
      </div>
    </div>

    <div style="background-color: #e2e8f0; color: #64748b; padding: 15px; text-align: center; font-size: 12px;">
      <p style="margin: 0;">This is a system-generated alert from the Ironframe matrix. Do not reply to this email.</p>
    </div>
  </div>
`;
}

function normalizeDeAckReason(reason: string): DeAckReason {
  switch (reason) {
    case DeAckReason.FALSE_POSITIVE:
    case 'FALSE_POSITIVE':
    case 'False Positive':
      return DeAckReason.FALSE_POSITIVE;
    case DeAckReason.COMPENSATING_CONTROL:
    case 'COMPENSATING_CONTROL':
    case 'Compensating Control':
      return DeAckReason.COMPENSATING_CONTROL;
    case DeAckReason.ACCEPTABLE_RISK:
    case 'ACCEPTABLE_RISK':
    case 'Acceptable Risk':
      return DeAckReason.ACCEPTABLE_RISK;
    case DeAckReason.DUPLICATE:
    case 'DUPLICATE':
    case 'Duplicate':
      return DeAckReason.DUPLICATE;
    default: {
      const normalized = reason.trim().toUpperCase().replace(/\s+/g, '_');
      const fallback = (DeAckReason as Record<string, DeAckReason | undefined>)[normalized];
      return fallback ?? DeAckReason.FALSE_POSITIVE;
    }
  }
}

function warnMissingDelegate(delegateName: string) {
  console.warn(
    `[threatActions] Prisma delegate "${delegateName}" is unavailable. ` +
      `Run prisma generate after schema updates.`,
  );
}

type TransactionClient = {
  threatEvent: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string } | null>;
    update: (args: unknown) => Promise<any>;
  };
  auditLog: { create: (args: unknown) => Promise<any> };
  workNote: { create: (args: unknown) => Promise<any> };
};

type MissingRecordResponse = { success: false; error: 'AUDIT_LOG_FAILURE: Record no longer exists.' };
type ActionFailureResponse = { success: false; error: string };

/** Validate threat exists, then run update + audit create in one transaction. Throws AUDIT_LOG_FAILURE if threat does not exist. */
async function runThreatTransaction<T>(
  id: string,
  run: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const client = tx as unknown as TransactionClient;
    const exists = await client.threatEvent.findUnique({ where: { id } });
    if (exists == null) {
      console.warn(`[GRC Guard] Prevented action on missing Threat ID: ${id}`);
      return { success: false, error: 'AUDIT_LOG_FAILURE: Record no longer exists.' } as unknown as T;
    }
    return run(client);
  });
}

export async function acknowledgeThreatAction(
  id: string,
  tenantId: string,
  operatorId: string,
  justification?: string,
): Promise<{ success: true } | ActionFailureResponse | void> {
  if (tenantId == null || tenantId === undefined || tenantId === '') {
    throw new Error('Irongate Rejection: Missing Tenant Context. Zero-Trust violation.');
  }
  console.log(`[ACTION] Starting Acknowledge for ID: ${id}`);

  const existing = await prisma.threatEvent.findUnique({
    where: { id },
    select: { financialRisk_cents: true },
  });
  if (existing && existing.financialRisk_cents != null) {
    const threshold = getGrcThresholdCents();
    const cents = BigInt(existing.financialRisk_cents);
    const noteText = (justification ?? '').trim();
    const noteLen = noteText.length;
    const requiredLen = cents >= threshold ? 50 : 10;
    const hasRequiredNote = noteLen >= requiredLen;
    if (!hasRequiredNote) {
      return {
        success: false,
        error:
          'GRC Violation: High-value threats require a 50+ character work note/justification.',
      };
    }
  }

  if (!prismaDelegates.threatEvent?.update || !prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return;
  }

  try {
    const normalizedJustification = (justification ?? '').trim();
    const parsedJustification = workNoteSchema.safeParse({ text: normalizedJustification });
    if (!parsedJustification.success) {
      return {
        success: false,
        error: parsedJustification.error.issues.map((i) => i.message).join('; '),
      };
    }
    const savedWorkNoteText = parsedJustification.data.text;

    const result = await runThreatTransaction(id, async (tx) => {
      await tx.workNote.create({
        data: {
          text: savedWorkNoteText,
          operatorId,
          threatId: id,
        },
      });
      await tx.threatEvent.update({
        where: { id },
        data: { status: ThreatState.ACTIVE },
      });
      console.log(`[DB] Threat updated to ACTIVE`);
      await tx.auditLog.create({
        data: {
          action: 'THREAT_ACKNOWLEDGED',
          justification: savedWorkNoteText,
          operatorId,
          threatId: id,
        },
      });
      console.log(`[DB] Audit log created successfully`);
    });
    const maybeMissing = result as unknown as MissingRecordResponse | undefined;
    if (maybeMissing?.success === false) {
      return maybeMissing;
    }
    const maybeFailure = result as unknown as ActionFailureResponse | undefined;
    if (maybeFailure?.success === false) {
      return maybeFailure;
    }

    revalidatePath('/');
    console.log(`[UI] Path revalidated`);
    return { success: true };
  } catch (error) {
    console.error('[ACTION FAILED]:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function confirmThreatAction(id: string, operatorId: string): Promise<{ success: true } | void> {
  if (!prismaDelegates.threatEvent?.update || !prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return;
  }

  try {
    await runThreatTransaction(id, async (tx) => {
      await tx.threatEvent.update({
        where: { id },
        data: { status: ThreatState.CONFIRMED },
      });
      await tx.auditLog.create({
        data: {
          action: 'THREAT_CONFIRMED',
          justification: null,
          operatorId,
          threatId: id,
        },
      });
    });

    revalidatePath('/');

    await logThreatActivity(id, 'STATUS_UPDATED', `Threat status changed to CONFIRMED.`);

    // Dispatch confirmation email and GRC-routed notification
    try {
      const threat = await prisma.threatEvent.findUnique({
        where: { id },
        select: { title: true, status: true, financialRisk_cents: true },
      });
      const threatTitle = threat?.title ?? id;
      const state = threat?.status ?? 'CONFIRMED';
      const financialRisk_cents = threat?.financialRisk_cents ?? BigInt(0);
      console.log(`[CONFIRM] Dispatching confirmation email for threat ${id} (${threatTitle})...`);

      const briefThreat: SecurityBriefThreat = {
        title: threatTitle,
        id,
        financialRisk_cents,
      };
      await sendRiskNotification(
        targetEmail,
        `[GRC ALERT] Threat Confirmed: ${threatTitle}`,
        generateSecurityBrief(briefThreat, 'CONFIRMED'),
      );

      const emailResult = await sendThreatConfirmationEmail({
        threatId: id,
        threatTitle,
        operatorId,
      });
      if (emailResult.success) {
        console.log('[CONFIRM] Confirmation email sent successfully.');
      } else {
        console.error('[EMAIL ERROR]', emailResult.error);
      }
      // Enterprise GRC: route notification by liability/state (EXECUTIVE / OPERATIONAL / COMPLIANCE)
      await routeRiskNotification({
        id,
        title: threatTitle,
        state: String(state),
        financialRisk_cents: Number(financialRisk_cents),
      });
    } catch (emailError) {
      console.error('[EMAIL ERROR]', emailError);
    }

    return { success: true };
  } catch (error) {
    console.error('[ACTION FAILED] confirmThreatAction:', error);
    throw error;
  }
}

export async function resolveThreatAction(id: string, operatorId: string): Promise<{ success: true; financialRisk_cents: number } | { success: false; financialRisk_cents: 0 }> {
  if (!prismaDelegates.threatEvent?.update || !prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return { success: false, financialRisk_cents: 0 };
  }

  const updated = await runThreatTransaction(id, async (tx) => {
    const updatedRow = await tx.threatEvent.update({
      where: { id },
      data: { status: ThreatState.RESOLVED },
      select: { financialRisk_cents: true },
    });
    await tx.auditLog.create({
      data: {
        action: 'THREAT_RESOLVED',
        justification: null,
        operatorId,
        threatId: id,
      },
    });
    return updatedRow as { financialRisk_cents?: bigint };
  });

  const financialRisk_cents = Number(updated?.financialRisk_cents ?? BigInt(0));
  revalidatePath('/');

  await logThreatActivity(id, 'STATUS_UPDATED', `Threat status changed to RESOLVED.`);

  try {
    const threat = await prisma.threatEvent.findUnique({
      where: { id },
      select: { title: true },
    });
    const threatTitle = threat?.title ?? id;
    const briefThreat: SecurityBriefThreat = {
      title: threatTitle,
      id,
      financialRisk_cents: BigInt(financialRisk_cents),
    };
    await sendRiskNotification(
      targetEmail,
      `[GRC UPDATE] Threat Resolved: ${threatTitle}`,
      generateSecurityBrief(briefThreat, 'RESOLVED'),
    );
    await routeRiskNotification({
      id,
      title: threat?.title ?? id,
      state: 'RESOLVED',
      financialRisk_cents,
    });
  } catch (e) {
    console.error('[EMAIL ERROR] resolve GRC notification', e);
  }

  return { success: true, financialRisk_cents };
}

export async function deAcknowledgeThreatAction(
  id: string,
  tenantId: string,
  reason: string,
  justification: string,
  operatorId: string,
): Promise<{ success: true } | MissingRecordResponse | ActionFailureResponse | void> {
  if (!tenantId) throw new Error("Irongate Rejection: Missing Tenant Context. Zero-Trust violation.");
  if (!prismaDelegates.threatEvent?.update || !prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return;
  }

  const existing = await prisma.threatEvent.findUnique({
    where: { id },
    select: { financialRisk_cents: true },
  });
  if (existing && existing.financialRisk_cents != null) {
    const threshold = getGrcThresholdCents();
    const cents = BigInt(existing.financialRisk_cents);
    const latestNote = await prisma.workNote.findFirst({
      where: { threatId: id },
      orderBy: { createdAt: 'desc' },
      select: { text: true },
    });
    const noteLen = latestNote?.text ? latestNote.text.trim().length : 0;
    const requiredLen = cents >= threshold ? 50 : 10;
    const hasRequiredNote = noteLen >= requiredLen;
    if (!hasRequiredNote) {
      return {
        success: false,
        error:
          'GRC Violation: De-acknowledging a threat requires a documented work note. Open the drawer and save your reasoning first.',
      };
    }
  }

  const result = await runThreatTransaction(id, async (tx) => {
    const mappedReason = normalizeDeAckReason(reason);
    await tx.threatEvent.update({
      where: { id },
      data: {
        status: ThreatState.DE_ACKNOWLEDGED,
        deAckReason: mappedReason,
      },
    });
    await tx.auditLog.create({
      data: {
        action: 'THREAT_DE_ACKNOWLEDGED',
        justification,
        operatorId,
        threatId: id,
      },
    });
    // # GRC_ACTION_CHIPS / audit directive — De-Ack must log STATE_REGRESSION
    await tx.auditLog.create({
      data: {
        action: 'STATE_REGRESSION',
        justification: 'User reversed acknowledgment of risk.',
        operatorId,
        threatId: id,
      },
    });
  });

  const maybeMissing = result as unknown as MissingRecordResponse | undefined;
  if (maybeMissing?.success === false) {
    return maybeMissing;
  }

  revalidatePath('/');
  return { success: true };
}

/** Re-escalate: move threat from ACTIVE back to PIPELINE so it reappears in Attack Velocity. Enforces tenantId (Irongate). */
export async function revertThreatToPipelineAction(
  id: string,
  tenantId: string,
  operatorId: string,
): Promise<{ success: true } | MissingRecordResponse | void> {
  if (tenantId == null || tenantId === undefined || tenantId === '') {
    throw new Error('Irongate Rejection: Missing Tenant Context. Zero-Trust violation.');
  }
  if (!prismaDelegates.threatEvent?.update || !prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return;
  }

  const result = await runThreatTransaction(id, async (tx) => {
    await tx.threatEvent.update({
      where: { id },
      data: { status: ThreatState.PIPELINE, deAckReason: null },
    });
    await tx.auditLog.create({
      data: {
        action: 'REVERT_TO_PIPELINE',
        justification: 'Re-escalated from Active Risks to Attack Velocity pipeline.',
        operatorId,
        threatId: id,
      },
    });
  });

  const maybeMissing = result as unknown as MissingRecordResponse | undefined;
  if (maybeMissing?.success === false) return maybeMissing;
  revalidatePath('/');
  return { success: true };
}

/** Reject risk ingestion/registration: creates server audit log only (threatId optional for client-only pipeline). */
export async function rejectThreatAction(id: string, operatorId: string): Promise<{ success: true } | void> {
  if (!prismaDelegates.auditLog?.create) {
    warnMissingDelegate('auditLog');
    return;
  }
  try {
    await prismaDelegates.auditLog.create({
      data: {
        action: 'RISK_REJECTED',
        justification: 'User rejected risk ingestion/registration.',
        operatorId,
        threatId: id,
      },
    });
    revalidatePath('/');
    return { success: true };
  } catch {
    // Threat may not exist (e.g. client-only pipeline); create audit without FK
    await prismaDelegates.auditLog.create({
      data: {
        action: 'RISK_REJECTED',
        justification: `User rejected risk ingestion/registration. threat_id: ${id}`,
        operatorId,
        threatId: null,
      },
    });
    revalidatePath('/');
    return { success: true };
  }
}

export async function addWorkNoteAction(threatId: string, text: string, operatorId: string): Promise<{ success: true } | { success: false; error: string }> {
  if (!prismaDelegates.workNote) {
    warnMissingDelegate('workNote');
    return { success: false, error: 'Work notes are not available.' };
  }
  const { workNoteSchema } = await import('@/app/utils/irongateSchema');
  const parsed = workNoteSchema.safeParse({ text });
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('; ');
    return { success: false, error: msg };
  }
  const trimmedText = parsed.data.text;
  try {
    await prismaDelegates.workNote.create({
      data: {
        text: trimmedText,
        operatorId,
        threatId,
      },
    });
    await logThreatActivity(
      threatId,
      'NOTES_ADDED',
      'Analyst appended new notes and context tags.',
    );
    return { success: true };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'P2003') {
      return { success: false, error: 'Threat record not found. Save the threat from the pipeline first, or open a threat that exists in the system.' };
    }
    const message = err instanceof Error ? err.message : 'Failed to save note.';
    return { success: false, error: message };
  }
}

export async function saveAIReportToThreat(threatId: string, aiReport: string): Promise<{ success: true } | { success: false; error: string }> {
  if (!prismaDelegates.threatEvent?.update || !prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return { success: false, error: 'Database update failed' };
  }
  try {
    await runThreatTransaction(threatId, async (tx) => {
      await tx.threatEvent.update({
        where: { id: threatId },
        data: { aiReport },
      });
      await tx.auditLog.create({
        data: {
          action: 'AI_REPORT_SAVED',
          justification: null,
          operatorId: 'CoreIntel',
          threatId,
        },
      });
    });
    await logThreatActivity(
      threatId,
      'AI_REPORT_SAVED',
      'CoreIntel Agent completed analysis and saved findings.',
    );
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[DB_SAVE_ERROR] Failed to save AI report:', error);
    return { success: false, error: 'Database update failed' };
  }
}

