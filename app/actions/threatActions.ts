'use server';

import { createHmac, randomUUID } from "crypto";
import { revalidatePath } from 'next/cache';
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { EventSource, ThreatState, DeAckReason, AgentOperationStatus, type UserRole } from '@prisma/client';
import { executeWithRetry, type ExecuteWithRetryResult } from '@/app/utils/irontechResilience';
import {
  isRemoteAccessAdminEligible,
  requireSupabaseAdminOrOwnerForRemoteAccess,
} from '@/app/utils/serverAuth';
import { sendThreatConfirmationEmail, routeRiskNotification, sendRiskNotification } from '@/app/actions/email';
import {
  mergeIngestionDetailsPatch,
  parseIngestionDetailsForMerge,
} from '@/app/utils/ingestionDetailsMerge';
import { isGrcInfrastructureLimitMessage } from '@/app/utils/grcInfrastructureLimit';
import { logThreatActivity } from '@/app/actions/auditActions';
import { recordSustainabilityImpact } from '@/app/actions/sustainabilityActions';
import { grcGatePass, getGrcThresholdCents } from '@/app/utils/grcGate';
import { shadowReceiptAuditStub } from '@/app/lib/grc/threatReceipt';
import { workNoteSchema } from '@/app/utils/irongateSchema';
import {
  assigneeKeyToDisplayName,
  operatorIdToDisplayName,
} from '@/app/utils/assignmentChainOfCustody';
import { getCompanyIdForActiveTenant } from '@/app/lib/grc/clearanceThreatResolve';
import { buildChaosFinalAckIngestionPatch } from '@/app/config/chaosScenarioTelemetry';
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { integrityService } from "@/src/services/integrityService";
import { transitionThreatStatus, updateThreatWithIntegrity } from "@/src/services/threatStateService";
import { attachEvidenceToThreat } from "@/app/actions/evidenceActions";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";

/** Threat resolution approve / reject / review — program leadership. */
const THREAT_RESOLUTION_APPROVER_ROLES: UserRole[] = [
  "GRC_MANAGER",
  "GLOBAL_ADMIN",
  "CISO",
  "DIRECTOR_OF_COMPLIANCE",
];

type AcknowledgeResolvedThreat =
  | { plane: 'prod'; row: { financialRisk_cents: bigint; sourceAgent: string } }
  | { plane: 'shadow'; row: { financialRisk_cents: bigint; sourceAgent: string } };

/** Strict tenant isolation: production first, then shadow — same `tenantCompanyId` scope for both planes. */
async function resolveThreatForAcknowledge(
  threatId: string,
  companyId: bigint | null,
): Promise<AcknowledgeResolvedThreat | null> {
  const grcSelect = { financialRisk_cents: true, sourceAgent: true } as const;
  if (companyId == null) return null;

  const prod = await prisma.threatEvent.findFirst({
    where: { id: threatId, tenantCompanyId: companyId },
    select: grcSelect,
  });
  if (prod) return { plane: 'prod', row: prod };

  const sim = await prisma.simThreatEvent.findFirst({
    where: { id: threatId, tenantCompanyId: companyId },
    select: grcSelect,
  });
  if (sim) return { plane: 'shadow', row: sim };
  return null;
}
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
const GRC_PROTOCOL_VIOLATION =
  "GRC_PROTOCOL_VIOLATION: Missing approved attestation or evidence artifact.";

/** Kimbot System Integrity drill: vault manifest satisfies evidence gate when no DMZ attachment exists. */
const SIM_MANIFEST_EVIDENCE_URL = "https://vault.internal/sim-manifest.pdf";

const GRC_CISO_SIMULATION_AUTH_EVENT = "[GRC] CISO Simulation Authorization";

/** System Integrity Control Room: Kimbot, Grcbot, or Attbot + chaos test JSON. */
function isSystemIntegrityBotChaosDrillThreatOnServer(args: {
  title: string;
  ingestionDetails: string | null | undefined;
}): boolean {
  const title = args.title.trim().toUpperCase();
  const isBotLine =
    title.includes("KIMBOT") || title.includes("GRCBOT") || title.includes("ATTBOT");
  if (!isBotLine) return false;
  try {
    const o = JSON.parse(args.ingestionDetails ?? "{}") as Record<string, unknown>;
    if (o.isChaosTest === true) return true;
  } catch {
    /* ignore */
  }
  return title.includes("SYSTEM INTEGRITY");
}

/** Alias — same rules as `isSystemIntegrityBotChaosDrillThreatOnServer`. */
const isSystemIntegrityKimbotDrillThreatOnServer = isSystemIntegrityBotChaosDrillThreatOnServer;

function ingestionHasVaultSimManifest(ingestionDetails: string | null | undefined): boolean {
  try {
    const o = JSON.parse(ingestionDetails ?? "{}") as Record<string, unknown>;
    return o.evidenceLink === SIM_MANIFEST_EVIDENCE_URL;
  } catch {
    return false;
  }
}

function parseShadowHandshakeApproval(ingestionDetails: string | null | undefined): {
  resolutionApprovalId: string | null;
  resolutionApprovalStatus: string | null;
} {
  try {
    const j = JSON.parse(ingestionDetails ?? "{}") as {
      shadowCisoHandshake?: {
        resolutionApprovalId?: string;
        resolutionApprovalStatus?: string;
      };
    };
    const h = j?.shadowCisoHandshake;
    const id = typeof h?.resolutionApprovalId === "string" ? h.resolutionApprovalId.trim() : null;
    const st = typeof h?.resolutionApprovalStatus === "string" ? h.resolutionApprovalStatus.trim() : null;
    return { resolutionApprovalId: id, resolutionApprovalStatus: st };
  } catch {
    return { resolutionApprovalId: null, resolutionApprovalStatus: null };
  }
}

function ingestionIsChaosSimulationTest(ingestionDetails: string | null | undefined): boolean {
  try {
    const o = JSON.parse(ingestionDetails ?? "{}") as Record<string, unknown>;
    return o.isChaosTest === true;
  } catch {
    return false;
  }
}

/**
 * Shadow plane: Epic 11 / CISO attestation lives in `ingestionDetails.shadowCisoHandshake`, not `ThreatApproval`.
 * Kimbot System Integrity drill also requires the vault manifest URL on the row.
 */
function simShadowPassesResolutionProtocol(title: string, ingestionDetails: string | null | undefined): boolean {
  const shadow = parseShadowHandshakeApproval(ingestionDetails);
  const approved =
    Boolean(shadow.resolutionApprovalId) && shadow.resolutionApprovalStatus === "APPROVED";

  if (isSystemIntegrityBotChaosDrillThreatOnServer({ title, ingestionDetails })) {
    return approved && ingestionHasVaultSimManifest(ingestionDetails);
  }

  if (approved) return true;

  if (ingestionIsChaosSimulationTest(ingestionDetails)) {
    return true;
  }

  return false;
}

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
    findUnique: (args: unknown) => Promise<any>;
    update: (args: unknown) => Promise<any>;
  };
  company: {
    findUnique: (args: unknown) => Promise<{ tenantId: string } | null>;
  };
  integrityEvent: {
    findFirst: (args: unknown) => Promise<{ eventHash: string } | null>;
    create: (args: unknown) => Promise<unknown>;
  };
  auditLog: { create: (args: unknown) => Promise<any> };
  workNote: { create: (args: unknown) => Promise<any> };
};

type MissingRecordResponse = { success: false; error: string };
type ActionFailureResponse = { success: false; error: string };

const DEFAULT_THREAT_TX_GUARD_ERROR = 'AUDIT_LOG_FAILURE: Record no longer exists.';

/** Post-pipeline states: acknowledge already applied (ThreatState has no separate ACKNOWLEDGED — ACTIVE is that milestone). */
const IDEMPOTENT_ACK_STATUSES: ThreatState[] = [
  ThreatState.ACTIVE,
  ThreatState.CONFIRMED,
  ThreatState.ESCALATED,
  ThreatState.PENDING_REMOTE_INTERVENTION,
  ThreatState.RESOLVED,
];

/** Idempotent repeat-ack: row already ACTIVE+ under the same tenant scope (prod or shadow). */
async function tryIdempotentAcknowledgeSuccess(
  id: string,
  sessionCompanyId: bigint | null,
): Promise<{ success: true } | null> {
  if (sessionCompanyId == null) return null;
  const statusIn = { in: IDEMPOTENT_ACK_STATUSES };

  const prodScoped = await prisma.threatEvent.findFirst({
    where: { id, tenantCompanyId: sessionCompanyId, status: statusIn },
    select: { id: true },
  });
  if (prodScoped) return { success: true };

  const simScoped = await prisma.simThreatEvent.findFirst({
    where: { id, tenantCompanyId: sessionCompanyId, status: statusIn },
    select: { id: true },
  });
  if (simScoped) return { success: true };

  return null;
}

/** Validate production ThreatEvent exists, then run update + audit create in one transaction. (Always uses threatEvent — never SimThreatEvent.) */
async function runThreatTransaction<T>(
  id: string,
  run: (tx: TransactionClient) => Promise<T>,
  options?: { missingRecordError?: string },
): Promise<T> {
  const missingErr = options?.missingRecordError ?? DEFAULT_THREAT_TX_GUARD_ERROR;
  return prisma.$transaction(async (tx) => {
    const client = tx as unknown as TransactionClient;
    const exists = await client.threatEvent.findUnique({
      where: { id },
      select: { id: true },
    });
    if (exists == null) {
      console.warn(`[GRC Guard] Prevented action on missing Threat ID: ${id} (${missingErr})`);
      return { success: false, error: missingErr } as unknown as T;
    }
    return run(client);
  });
}

export type AcknowledgeThreatActionResult =
  | { success: true; warning?: string }
  | ActionFailureResponse
  | void;

export async function acknowledgeThreatAction(
  id: string,
  tenantId: string,
  _operatorId: string,
  justification?: string,
): Promise<AcknowledgeThreatActionResult> {
  if (tenantId == null || tenantId === undefined || tenantId === '') {
    throw new Error('Irongate Rejection: Missing Tenant Context. Zero-Trust violation.');
  }

  const sessionUser = await getSupabaseSessionUser();
  if (sessionUser == null) {
    return {
      success: false,
      error: "Authentication required. Sign in to acknowledge threats.",
    };
  }
  const operatorId =
    (typeof sessionUser.id === "string" && sessionUser.id.trim() ? sessionUser.id.trim() : "") ||
    sessionUser.email?.trim() ||
    "";
  if (operatorId.length < 1) {
    return {
      success: false,
      error: "Invalid session: no operator id or email for attribution.",
    };
  }

  const sessionCompanyId = await getCompanyIdForActiveTenant();
  if (sessionCompanyId == null) {
    throw new Error('Irongate Rejection: Missing company context for tenant isolation.');
  }

  const TOP_SECTOR_SOURCE = 'Top Sector Threats';
  const TOP_SECTOR_JUSTIFICATION = 'Top Sector Threat';

  const grcAckSelect = { financialRisk_cents: true, sourceAgent: true } as const;

  const prodRow = await prisma.threatEvent.findFirst({
    where: { id, tenantCompanyId: sessionCompanyId },
    select: grcAckSelect,
  });

  let resolved: AcknowledgeResolvedThreat | null = null;
  if (prodRow) {
    resolved = { plane: 'prod', row: prodRow };
  } else {
    const simRow = await prisma.simThreatEvent.findFirst({
      where: { id, tenantCompanyId: sessionCompanyId },
      select: grcAckSelect,
    });
    if (simRow) {
      resolved = { plane: 'shadow', row: simRow };
    }
  }

  if (!resolved) {
    const idem = await tryIdempotentAcknowledgeSuccess(id, sessionCompanyId);
    if (idem) {
      revalidatePath('/');
      return idem;
    }
    throw new Error(`Threat not found or access denied. (ID: ${id})`);
  }

  const isShadowAck = resolved.plane === 'shadow';
  const existing = resolved.row;
  if (existing && existing.financialRisk_cents != null) {
    const threshold = getGrcThresholdCents();
    const cents = BigInt(existing.financialRisk_cents);
    const noteText = (justification ?? '').trim();
    const noteLen = noteText.length;
    const requiredLen = cents >= threshold ? 50 : 10;
    const isTopSectorVerifiedIntel =
      existing.sourceAgent === TOP_SECTOR_SOURCE && noteText === TOP_SECTOR_JUSTIFICATION;
    const hasRequiredNote = isTopSectorVerifiedIntel || noteLen >= requiredLen;
    if (!hasRequiredNote) {
      return {
        success: false,
        error:
          'GRC Violation: High-value threats require a 50+ character work note/justification.',
      };
    }
  }

  if (!prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return;
  }
  if (!isShadowAck && !prismaDelegates.threatEvent?.update) {
    if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
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

    if (isShadowAck) {
      await prisma.$transaction(async (tx) => {
        const detailsRow = await tx.simThreatEvent.findUnique({
          where: { id },
          select: { ingestionDetails: true },
        });
        if (detailsRow == null) {
          console.warn(`[Acknowledge Phase 2] SimThreatEvent missing inside TX after resolve: ${id}`);
          throw new Error(
            '[Acknowledge Phase 2 – Shadow TX] simThreatEvent row missing before update (race delete or ID mismatch; production ThreatEvent guard not used here).',
          );
        }
        const chaosAckPatch = buildChaosFinalAckIngestionPatch(detailsRow.ingestionDetails ?? null);
        const nextIngestionDetails = mergeIngestionDetailsPatch(detailsRow.ingestionDetails ?? null, {
          grcJustification: savedWorkNoteText,
          ...(chaosAckPatch ?? {}),
        });
        await tx.simThreatEvent.update({
          where: { id },
          data: {
            status: ThreatState.ACTIVE,
            ingestionDetails: nextIngestionDetails,
          },
          select: { id: true },
        });
        await tx.auditLog.create({
          data: {
            action: 'THREAT_ACKNOWLEDGED',
            justification: JSON.stringify({
              ...shadowReceiptAuditStub(id),
              text: savedWorkNoteText,
            }),
            operatorId,
            threatId: null,
            isSimulation: true,
          },
        });
      });
      revalidatePath('/');
      return { success: true as const };
    } else {
      const result = await runThreatTransaction(
        id,
        async (tx) => {
          const detailsRow = await tx.threatEvent.findUnique({
            where: { id },
            select: { ingestionDetails: true },
          });
          const chaosAckPatch = buildChaosFinalAckIngestionPatch(detailsRow?.ingestionDetails ?? null);
          const nextIngestionDetails = mergeIngestionDetailsPatch(detailsRow?.ingestionDetails ?? null, {
            grcJustification: savedWorkNoteText,
            ...(chaosAckPatch ?? {}),
          });

          await tx.workNote.create({
            data: {
              text: savedWorkNoteText,
              operatorId,
              threatId: id,
            },
          });
          // ingestionDetails is @db.Text: store merged JSON as string (never a Prisma Json/metadata column).
          await transitionThreatStatus({
            threatId: id,
            newStatus: ThreatState.ACTIVE,
            actorUserId: operatorId,
            eventType: "THREAT_ACKNOWLEDGED",
            tx,
            extraChanges: {
              ingestionDetails: nextIngestionDetails,
            },
            select: { id: true },
          });
          await tx.auditLog.create({
            data: {
              action: 'THREAT_ACKNOWLEDGED',
              justification: savedWorkNoteText,
              operatorId,
              threatId: id,
            },
          });
        },
        {
          missingRecordError:
            '[Acknowledge Phase 3 – Prod TX / runThreatTransaction] threatEvent missing inside transaction guard (shadow row never uses this path).',
        },
      );
      const maybeMissing = result as unknown as MissingRecordResponse | undefined;
      if (maybeMissing?.success === false) {
        return maybeMissing;
      }
      const maybeFailure = result as unknown as ActionFailureResponse | undefined;
      if (maybeFailure?.success === false) {
        return maybeFailure;
      }

      revalidatePath('/');
      return { success: true as const };
    }
  } catch (error) {
    console.error('[ACTION FAILED]:', error);
    const base = error instanceof Error ? error.message : String(error);
    const diag = `(ID: ${id}, CoID: ${sessionCompanyId.toString()}, plane: ${isShadowAck ? 'shadow' : 'prod'})`;
    return {
      success: false,
      error: `${base} ${diag}`,
    };
  }
}

export async function confirmThreatAction(
  id: string,
  operatorId: string,
): Promise<{ success: true } | ActionFailureResponse | void> {
  const sessionCompanyId = await getCompanyIdForActiveTenant();
  const resolved = await resolveThreatForAcknowledge(id, sessionCompanyId);
  if (resolved == null) {
    return {
      success: false,
      error:
        '[Confirm Phase 0] No ThreatEvent or SimThreatEvent for this id and tenant scope.',
    };
  }

  const isShadow = resolved.plane === 'shadow';

  if (!prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return;
  }
  if (!isShadow && !prismaDelegates.threatEvent?.update) {
    if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
    return;
  }

  try {
    if (isShadow) {
      await prisma.$transaction(async (tx) => {
        const row = await tx.simThreatEvent.findUnique({
          where: { id },
          select: { id: true },
        });
        if (row == null) {
          console.warn(`[Confirm Phase 2] SimThreatEvent missing inside TX after resolve: ${id}`);
          throw new Error(
            '[Confirm Phase 2 – Shadow TX] simThreatEvent row missing before update (race delete or ID mismatch).',
          );
        }
        await tx.simThreatEvent.update({
          where: { id },
          data: { status: ThreatState.CONFIRMED },
          select: { id: true },
        });
        await tx.auditLog.create({
          data: {
            action: 'THREAT_CONFIRMED',
            justification: JSON.stringify(shadowReceiptAuditStub(id)),
            operatorId,
            threatId: null,
            isSimulation: true,
          },
        });
      });
      revalidatePath('/');
      await logThreatActivity(null, 'STATUS_UPDATED', `Threat status changed to CONFIRMED (shadow). simThreatId:${id}`, {
        isSimulation: true,
      });

      try {
        const threat = await prisma.simThreatEvent.findUnique({
          where: { id },
          select: { title: true, status: true, financialRisk_cents: true },
        });
        const threatTitle = threat?.title ?? id;
        const state = threat?.status ?? 'CONFIRMED';
        const financialRisk_cents = threat?.financialRisk_cents ?? BigInt(0);
        console.log(`[CONFIRM] Dispatching confirmation email for shadow threat ${id} (${threatTitle})...`);

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
    }

    const result = await runThreatTransaction(
      id,
      async (tx) => {
        await transitionThreatStatus({
          threatId: id,
          newStatus: ThreatState.CONFIRMED,
          actorUserId: operatorId,
          eventType: "THREAT_CONFIRMED",
          tx,
          select: { id: true },
        });
        await tx.auditLog.create({
          data: {
            action: 'THREAT_CONFIRMED',
            justification: null,
            operatorId,
            threatId: id,
          },
        });
      },
      {
        missingRecordError:
          '[Confirm Phase 3 – Prod TX / runThreatTransaction] threatEvent missing inside transaction guard (shadow row never uses this path).',
      },
    );
    const maybeMissing = result as unknown as MissingRecordResponse | undefined;
    if (maybeMissing?.success === false) {
      return maybeMissing;
    }
    const maybeFailure = result as unknown as ActionFailureResponse | undefined;
    if (maybeFailure?.success === false) {
      return maybeFailure;
    }

    revalidatePath('/');

    await logThreatActivity(id, 'STATUS_UPDATED', `Threat status changed to CONFIRMED.`);

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
    const base = error instanceof Error ? error.message : String(error);
    const diag = `(ID: ${id}, CoID: ${sessionCompanyId?.toString() ?? 'null'}, plane: ${isShadow ? 'shadow' : 'prod'})`;
    return {
      success: false,
      error: `${base} ${diag}`,
    };
  }
}

export async function resolveThreatAction(
  id: string,
  operatorId: string,
  resolutionJustification: string,
  actorDisplayName?: string,
): Promise<{ success: true; financialRisk_cents: number } | { success: false; financialRisk_cents: 0 }> {
  const trimmed = resolutionJustification.trim();
  if (trimmed.length < 50) {
    return { success: false, financialRisk_cents: 0 };
  }
  const parsedNote = workNoteSchema.safeParse({ text: trimmed });
  if (!parsedNote.success) {
    return { success: false, financialRisk_cents: 0 };
  }

  const sessionCompanyIdForResolve = await getCompanyIdForActiveTenant();
  if (sessionCompanyIdForResolve != null && (await readSimulationPlaneEnabled())) {
    const simRow = await prisma.simThreatEvent.findFirst({
      where: { id, tenantCompanyId: sessionCompanyIdForResolve },
      select: {
        id: true,
        title: true,
        ingestionDetails: true,
        financialRisk_cents: true,
        status: true,
      },
    });
    if (simRow) {
      if (simRow.status === ThreatState.RESOLVED) {
        return {
          success: true,
          financialRisk_cents: Number(simRow.financialRisk_cents ?? BigInt(0)),
        };
      }
      if (!simShadowPassesResolutionProtocol(simRow.title, simRow.ingestionDetails)) {
        throw new Error(GRC_PROTOCOL_VIOLATION);
      }
      const ts = new Date().toISOString();
      const actor = (actorDisplayName?.trim() || operatorIdToDisplayName(operatorId)).trim();
      const justificationPayload = JSON.stringify({
        resolution: trimmed,
        actor,
        actorId: operatorId,
        timestamp: ts,
      });
      const mergedIngestion = mergeIngestionDetailsPatch(simRow.ingestionDetails ?? null, {
        resolutionJustification: trimmed,
      });
      await prisma.$transaction(async (tx) => {
        await tx.simThreatEvent.update({
          where: { id: simRow.id },
          data: {
            status: ThreatState.RESOLVED,
            ingestionDetails: mergedIngestion,
          },
        });
        await tx.auditLog.create({
          data: {
            action: "THREAT_RESOLVED",
            justification: justificationPayload,
            operatorId,
            threatId: null,
            isSimulation: true,
          },
        });
      });
      revalidatePath("/");
      await logThreatActivity(null, "STATUS_UPDATED", `Threat status changed to RESOLVED (shadow). simThreatId:${id}`, {
        isSimulation: true,
      });
      return {
        success: true,
        financialRisk_cents: Number(simRow.financialRisk_cents ?? BigInt(0)),
      };
    }
  }

  if (!prismaDelegates.threatEvent?.update || !prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return { success: false, financialRisk_cents: 0 };
  }

  const ts = new Date().toISOString();
  const actor = (actorDisplayName?.trim() || operatorIdToDisplayName(operatorId)).trim();
  const justificationPayload = JSON.stringify({
    resolution: trimmed,
    actor,
    actorId: operatorId,
    timestamp: ts,
  });

  const threatForGate = await prisma.threatEvent.findUnique({
    where: { id },
    select: {
      id: true,
      tenantCompanyId: true,
      resolutionApprovalId: true,
      ingestionDetails: true,
      title: true,
    },
  });
  if (!threatForGate?.tenantCompanyId || !threatForGate.resolutionApprovalId) {
    throw new Error(GRC_PROTOCOL_VIOLATION);
  }
  const company = await prisma.company.findUnique({
    where: { id: threatForGate.tenantCompanyId },
    select: { tenantId: true },
  });
  if (!company?.tenantId) {
    throw new Error(GRC_PROTOCOL_VIOLATION);
  }
  const approval = await prisma.threatApproval.findUnique({
    where: { id: threatForGate.resolutionApprovalId },
    select: { id: true, status: true, threatId: true, tenantId: true },
  });
  if (
    !approval ||
    approval.status !== "APPROVED" ||
    approval.threatId !== id ||
    approval.tenantId !== company.tenantId
  ) {
    throw new Error(GRC_PROTOCOL_VIOLATION);
  }
  const linkedEvidence = await prisma.evidenceAttachment.findFirst({
    where: {
      tenantId: company.tenantId,
      entityType: "THREAT_EVENT",
      entityId: id,
    },
    select: { id: true },
  });
  const allowSimKimbotManifest =
    isSystemIntegrityKimbotDrillThreatOnServer({
      title: threatForGate.title ?? "",
      ingestionDetails: threatForGate.ingestionDetails,
    }) && ingestionHasVaultSimManifest(threatForGate.ingestionDetails);
  if (!linkedEvidence && !allowSimKimbotManifest) {
    throw new Error(GRC_PROTOCOL_VIOLATION);
  }

  const updated = await runThreatTransaction(id, async (tx) => {
    const prismaTx = tx as unknown as Prisma.TransactionClient;
    const updatedRow = await transitionThreatStatus<{ financialRisk_cents?: bigint }>({
      threatId: id,
      newStatus: ThreatState.RESOLVED,
      approvalId: approval.id,
      actorUserId: operatorId,
      eventType: "THREAT_RESOLVED",
      tx: prismaTx,
      select: { financialRisk_cents: true },
    });
    const approvedArtifacts = await prismaTx.evidenceArtifact.findMany({
      where: {
        tenantId: approval.tenantId,
        attachments: {
          some: {
            entityType: "THREAT_EVENT",
            entityId: id,
          },
        },
      },
      select: { storagePath: true },
    });
    if (approvedArtifacts.length > 0) {
      await prismaTx.quarantineRecord.updateMany({
        where: {
          tenantId: approval.tenantId,
          storagePath: { in: approvedArtifacts.map((artifact) => artifact.storagePath) },
        },
        data: { status: "PERMANENT" },
      });
    }
    await prismaTx.auditLog.create({
      data: {
        action: 'THREAT_RESOLVED',
        justification: justificationPayload,
        operatorId,
        threatId: id,
      },
    });
    return updatedRow as { financialRisk_cents?: bigint };
  });

  if (
    updated &&
    typeof updated === 'object' &&
    'success' in updated &&
    (updated as { success?: boolean }).success === false
  ) {
    return { success: false, financialRisk_cents: 0 };
  }

  const financialRisk_cents = Number(
    (updated as { financialRisk_cents?: bigint } | null)?.financialRisk_cents ?? BigInt(0),
  );
  revalidatePath('/');

  await logThreatActivity(id, 'STATUS_UPDATED', `Threat status changed to RESOLVED.`);

  const ironbloomSustainability = await recordSustainabilityImpact(id);
  if (!ironbloomSustainability.ok) {
    console.error('[Ironbloom] recordSustainabilityImpact failed:', ironbloomSustainability.error);
  }

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

/** Persist removal from Active board after autonomous resolve (UI "Acknowledge" kill-switch). */
export async function archiveThreat(
  threatId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const id = threatId.trim();
  if (!id) return { success: false, error: "Missing threat id." };
  try {
    await transitionThreatStatus({
      threatId: id,
      newStatus: ThreatState.DE_ACKNOWLEDGED,
      actorUserId: "system-archive",
      eventType: "THREAT_ARCHIVED",
      extraChanges: {
        deAckReason: DeAckReason.ACCEPTABLE_RISK,
      },
    });
    revalidatePath("/", "layout");
    revalidatePath("/");
    await logThreatActivity(
      id,
      "STATUS_UPDATED",
      "Threat de-acknowledged (active-board dismiss) — removed from live active queries.",
    );
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

export async function deAcknowledgeThreatAction(
  id: string,
  tenantId: string,
  reason: string,
  justification: string,
  operatorId: string,
): Promise<{ success: true } | MissingRecordResponse | ActionFailureResponse | void> {
  if (!tenantId) throw new Error("Irongate Rejection: Missing Tenant Context. Zero-Trust violation.");
  if (
    !prismaDelegates.threatEvent?.update ||
    !prismaDelegates.auditLog?.create ||
    !prismaDelegates.workNote?.create
  ) {
    if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    if (!prismaDelegates.workNote) warnMissingDelegate('workNote');
    return;
  }

  const trimmedReason = reason.trim();
  const trimmedJustification = justification.trim();
  if (!trimmedReason) {
    return { success: false, error: 'De-acknowledgement requires a selected reason.' };
  }

  const existing = await prisma.threatEvent.findUnique({
    where: { id },
    select: { financialRisk_cents: true },
  });
  if (!existing) {
    return {
      success: false,
      error: `[deAcknowledgeThreatAction] threatEvent.findUnique: no row for id ${id}`,
    };
  }

  const threshold = getGrcThresholdCents();
  const cents = BigInt(existing.financialRisk_cents ?? 0);
  const requiredLen = cents >= threshold ? 50 : 10;
  if (trimmedJustification.length < requiredLen) {
    return {
      success: false,
      error: `GRC Violation: Justification must be at least ${requiredLen} characters for this threat.`,
    };
  }

  const workNoteText = `[STATUS REVERTED: ${trimmedReason.toUpperCase()}] ${trimmedJustification}`;
  const parsedDeAckNote = workNoteSchema.safeParse({ text: workNoteText });
  if (!parsedDeAckNote.success) {
    return {
      success: false,
      error: parsedDeAckNote.error.issues.map((i) => i.message).join('; '),
    };
  }
  const savedDeAckWorkNoteText = parsedDeAckNote.data.text;

  const result = await runThreatTransaction(id, async (tx) => {
    await tx.workNote.create({
      data: {
        text: savedDeAckWorkNoteText,
        operatorId,
        threatId: id,
      },
    });
    const mappedReason = normalizeDeAckReason(trimmedReason);
    await transitionThreatStatus({
      threatId: id,
      newStatus: ThreatState.DE_ACKNOWLEDGED,
      actorUserId: operatorId,
      eventType: "THREAT_DE_ACKNOWLEDGED",
      tx,
      extraChanges: {
        deAckReason: mappedReason,
      },
      select: { id: true },
    });
    await tx.auditLog.create({
      data: {
        action: 'THREAT_DE_ACKNOWLEDGED',
        justification: trimmedJustification,
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
    await transitionThreatStatus({
      threatId: id,
      newStatus: ThreatState.PIPELINE,
      actorUserId: operatorId,
      eventType: "THREAT_REVERTED_TO_PIPELINE",
      tx,
      extraChanges: { deAckReason: null },
      select: { id: true },
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

/** Serialized audit row for ASSIGNMENT_CHANGED — matches client `assignmentHistory` entries. */
export type AssignmentChangedLogEntry = {
  id: string;
  action: string;
  justification: string | null;
  operatorId: string;
  createdAt: string;
};

/** Persist execution-board assignee on ThreatEvent or SimThreatEvent and append AuditLog (ASSIGNMENT_CHANGED). */
export async function setThreatAssigneeAction(
  threatId: string,
  assigneeId: string | null,
  tenantId: string,
  operatorId: string = 'admin-user-01',
  /** Human-readable operator label from UI session (e.g. "Dereck"); stored in audit JSON as `actor`. */
  actorDisplayName?: string,
): Promise<
  | { success: true; newLog: AssignmentChangedLogEntry | null }
  | ActionFailureResponse
> {
  if (!tenantId?.trim()) {
    return { success: false, error: 'Irongate Rejection: Missing Tenant Context.' };
  }
  if (!prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return { success: false, error: 'Database update failed.' };
  }
  const normalized = (assigneeId ?? '').trim();
  const value =
    normalized === '' || normalized.toLowerCase() === 'unassigned' ? null : normalized;

  const company = await prisma.company.findFirst({
    where: { tenantId: tenantId.trim() },
    select: { id: true },
  });
  if (!company) {
    return { success: false, error: 'Irongate Rejection: No company for tenant context.' };
  }
  const tenantCompanyId = company.id;

  const su = await getSupabaseSessionUser();
  const idFromSession =
    (su && typeof su.id === "string" && su.id.trim() ? su.id.trim() : su?.email?.trim()) || "";
  const effectiveOperatorId = idFromSession || operatorId;

  const buildJustification = (isSimulation: boolean) => {
    const t = new Date().toISOString();
    const actor = (actorDisplayName?.trim() || operatorIdToDisplayName(effectiveOperatorId)).trim();
    const newAssignee = value == null ? null : assigneeKeyToDisplayName(value);
    return JSON.stringify({
      newAssignee,
      actor,
      actorId: effectiveOperatorId,
      timestamp: t,
      isSimulation,
    });
  };

  const prod = await prisma.threatEvent.findFirst({
    where: { id: threatId, tenantCompanyId },
    select: { id: true, assigneeId: true },
  });

  if (prod) {
    if (!prismaDelegates.threatEvent?.update) {
      if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
      return { success: false, error: 'Database update failed.' };
    }
    const prev = prod.assigneeId ?? null;
    if (prev === value) {
      revalidatePath('/');
      return { success: true, newLog: null };
    }
    try {
      const created = await prisma.$transaction(async (tx) => {
        const existing = await tx.threatEvent.findUnique({
          where: { id: threatId },
          select: { assigneeId: true },
        });
        if (!existing) return null;
        if ((existing.assigneeId ?? null) === value) return null;
        await updateThreatWithIntegrity({
          threatId,
          changes: { assigneeId: value },
          actorUserId: effectiveOperatorId,
          eventType: "THREAT_ASSIGNEE_CHANGED",
          tx,
          select: { id: true },
        });
        return tx.auditLog.create({
          data: {
            action: 'ASSIGNMENT_CHANGED',
            justification: buildJustification(false),
            operatorId: effectiveOperatorId,
            threatId,
            isSimulation: false,
          },
        });
      });
      revalidatePath('/');
      if (!created) {
        return { success: true, newLog: null };
      }
      return {
        success: true,
        newLog: {
          id: created.id,
          action: created.action,
          justification: created.justification,
          operatorId: created.operatorId,
          createdAt: created.createdAt.toISOString(),
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save assignee.';
      return { success: false, error: message };
    }
  }

  const sim = await prisma.simThreatEvent.findFirst({
    where: { id: threatId, tenantCompanyId },
    select: { id: true, assigneeId: true },
  });

  if (sim) {
    const prev = sim.assigneeId ?? null;
    if (prev === value) {
      revalidatePath('/');
      return { success: true, newLog: null };
    }
    try {
      const created = await prisma.$transaction(async (tx) => {
        const row = await tx.simThreatEvent.findUnique({
          where: { id: threatId },
          select: { assigneeId: true },
        });
        if (!row) return null;
        if ((row.assigneeId ?? null) === value) return null;
        await tx.simThreatEvent.update({
          where: { id: threatId },
          data: { assigneeId: value },
          select: { id: true },
        });
        return tx.auditLog.create({
          data: {
            action: 'ASSIGNMENT_CHANGED',
            justification: buildJustification(true),
            operatorId: effectiveOperatorId,
            threatId: null,
            isSimulation: true,
            simThreatId: threatId,
          },
        });
      });
      revalidatePath('/');
      if (!created) {
        return { success: true, newLog: null };
      }
      return {
        success: true,
        newLog: {
          id: created.id,
          action: created.action,
          justification: created.justification,
          operatorId: created.operatorId,
          createdAt: created.createdAt.toISOString(),
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save assignee.';
      return { success: false, error: message };
    }
  }

  return {
    success: false,
    error: `[setThreatAssigneeAction] No ThreatEvent or SimThreatEvent for threatId ${threatId} in this tenant scope.`,
  };
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
      return {
        success: false,
        error: `[appendWorkNoteToThreat] FK P2003: threatEvent id ${threatId} missing — save pipeline threat first`,
      };
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
      await updateThreatWithIntegrity({
        threatId,
        changes: { aiReport },
        actorUserId: "CoreIntel",
        eventType: "AI_REPORT_SAVED",
        tx,
        select: { id: true },
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

const IRONTECH_AGENT_NAME = "Irontech";

export type ManualRecoveryPayload = {
  threatId: string;
  threatTitle: string;
  agentOperationId: string | null;
  failures: Array<{ attempt: number; error: string; at?: string }>;
  recipeSummary: string;
  diagnosticJson: string;
  threatStatus: string;
  remoteTechId: string | null;
  isRemoteAccessAuthorized: boolean;
  /** True when recorded failures indicate provider quota / rate limits (Sprint 6.19). */
  infrastructureLimitDetected: boolean;
};

/** Data for Manual Recovery overlay (failed attempts + diagnostic / Ironintel context). */
export async function getManualRecoveryData(
  threatId: string,
): Promise<ManualRecoveryPayload | { error: string }> {
  const tid = threatId.trim();
  const threat = await prisma.threatEvent.findUnique({
    where: { id: tid },
    select: {
      title: true,
      status: true,
      isRemoteAccessAuthorized: true,
      remoteTechId: true,
      ingestionDetails: true,
    },
  });
  if (!threat)
    return { error: `[getManualRecoveryData] threatEvent.findUnique: no row for threatId ${tid}` };
  const op = await prisma.agentOperation.findUnique({
    where: { threatId_agentName: { threatId: tid, agentName: IRONTECH_AGENT_NAME } },
  });
  const snap = op?.snapshot as Record<string, unknown> | null;
  const failures = Array.isArray(snap?.failures)
    ? (snap!.failures as ManualRecoveryPayload["failures"])
    : [];
  const dh = snap?.diagnosticHierarchy;
  let recipeSummary = "Remediation context appears in the diagnostic block below.";
  if (typeof dh === "object" && dh !== null) {
    const o = dh as Record<string, unknown>;
    if (typeof o.remediationSummary === "string") recipeSummary = o.remediationSummary;
    else if (typeof o.summary === "string") recipeSummary = o.summary;
    else recipeSummary = JSON.stringify(dh, null, 2).slice(0, 2500);
  }
  const failureProbe = failures.map((f) => f.error).join("\n");
  const infrastructureLimitDetected =
    isGrcInfrastructureLimitMessage(failureProbe) ||
    isGrcInfrastructureLimitMessage(String(threat.ingestionDetails ?? ""));
  return {
    threatId: tid,
    threatTitle: threat.title,
    agentOperationId: op?.id ?? null,
    failures,
    recipeSummary,
    diagnosticJson: JSON.stringify(snap ?? {}, null, 2).slice(0, 8000),
    threatStatus: String(threat.status),
    remoteTechId: threat.remoteTechId ?? null,
    isRemoteAccessAuthorized: threat.isRemoteAccessAuthorized,
    infrastructureLimitDetected,
  };
}

/**
 * GRC: acknowledge provider quota/rate-limit, reset Irontech AgentOperation to pending, return threat to ACTIVE.
 */
export async function acknowledgeGrcInfrastructureLimitAndResetAgent(
  threatId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const tid = threatId.trim();
  if (!tid) {
    return { success: false, error: "Missing threat id." };
  }
  const threat = await prisma.threatEvent.findUnique({
    where: { id: tid },
    select: { ingestionDetails: true },
  });
  if (!threat) {
    return {
      success: false,
      error: `[acknowledgeGrcInfrastructureLimitAndResetAgent] threatEvent.findUnique: no row for ${tid}`,
    };
  }
  const op = await prisma.agentOperation.findUnique({
    where: { threatId_agentName: { threatId: tid, agentName: IRONTECH_AGENT_NAME } },
  });
  const snap =
    op?.snapshot && typeof op.snapshot === "object" && op.snapshot !== null
      ? (op.snapshot as Record<string, unknown>)
      : {};
  const failures = Array.isArray(snap.failures)
    ? (snap.failures as Array<{ error?: string }>)
    : [];
  const probe = failures.map((f) => String(f.error ?? "")).join("\n");
  const ingProbe = String(threat.ingestionDetails ?? "");
  if (
    !isGrcInfrastructureLimitMessage(probe) &&
    !isGrcInfrastructureLimitMessage(ingProbe)
  ) {
    return {
      success: false,
      error:
        "No infrastructure quota or rate-limit error is recorded for this threat. Use standard recovery actions.",
    };
  }
  const base = parseIngestionDetailsForMerge(threat.ingestionDetails);
  delete base.irontechLive;
  base.grcInfrastructureLimitAcknowledgedAt = new Date().toISOString();
  const nextSnap: Record<string, unknown> = { ...snap, failures: [] };
  await prisma.$transaction(async (tx) => {
    await transitionThreatStatus({
      threatId: tid,
      newStatus: ThreatState.ACTIVE,
      actorUserId: "grc-desktop",
      eventType: "GRC_INFRA_RESET_ACTIVE",
      tx,
      extraChanges: {
        ingestionDetails: JSON.stringify(base),
      },
    });
    if (op) {
      await tx.agentOperation.update({
        where: { id: op.id },
        data: {
          status: AgentOperationStatus.PENDING,
          lastError: null,
          attemptCount: 0,
          snapshot: nextSnap as Prisma.InputJsonValue,
        },
      });
    } else {
      await tx.agentOperation.updateMany({
        where: { threatId: tid, agentName: IRONTECH_AGENT_NAME },
        data: {
          status: AgentOperationStatus.PENDING,
          lastError: null,
          attemptCount: 0,
        },
      });
    }
  });
  await prisma.auditLog.create({
    data: {
      action: "GRC_INFRASTRUCTURE_LIMIT_ACKNOWLEDGED",
      justification:
        "GRC acknowledged Gemini/provider quota or rate-limit; Irontech reset to pending; threat returned to ACTIVE.",
      operatorId: "grc-desktop",
      threatId: tid,
    },
  });
  revalidatePath("/");
  return { success: true };
}

export type ManualMitigationFourthAttemptResult =
  | { success: true }
  | { success: false; fourthAttemptFailed: true; error: string }
  | { success: false; fourthAttemptFailed: false; error: string };

function summarizeFourthAttemptResult(result: ExecuteWithRetryResult): ManualMitigationFourthAttemptResult {
  if (result.ok && result.completed) {
    return { success: true };
  }
  if (!result.ok && "escalated" in result && result.escalated) {
    return { success: false, fourthAttemptFailed: true, error: result.error };
  }
  const err =
    !result.ok && "error" in result ? result.error : "Mitigation attempt did not complete.";
  return { success: false, fourthAttemptFailed: false, error: err };
}

/** One mitigation attempt after manual review (bypasses chaos-test auto-fail tag). */
export async function manualMitigationFourthAttempt(
  threatId: string,
): Promise<ManualMitigationFourthAttemptResult> {
  const tid = threatId.trim();
  await transitionThreatStatus({
    threatId: tid,
    newStatus: ThreatState.ACTIVE,
    actorUserId: "grc-desktop",
    eventType: "MANUAL_MITIGATION_REARMED",
  });
  await prisma.agentOperation.updateMany({
    where: { threatId: tid, agentName: IRONTECH_AGENT_NAME },
    data: {
      status: AgentOperationStatus.PENDING,
      attemptCount: 0,
      lastError: null,
    },
  });
  const result = await executeWithRetry(IRONTECH_AGENT_NAME, tid, async () => {}, {
    maxAttempts: 1,
    bypassChaosTestTag: true,
  });
  revalidatePath("/");
  return summarizeFourthAttemptResult(result);
}

/**
 * Desktop recovery: resolve threat, complete AgentOperation, audit the authorizing operator.
 */
export async function authorizeManualResolution(
  threatId: string,
  operatorId: string,
  /** When ≥50 chars, used as audit resolution text; else default desktop-recovery template. */
  resolutionJustificationOverride?: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const tid = threatId.trim();
  const op = operatorId.trim() || "operator-unknown";
  const override = resolutionJustificationOverride?.trim() ?? "";
  const justification =
    override.length >= 50
      ? override
      : `Manual resolution authorized by operator ${op} after Irontech Phone Home escalation. ` +
        "Threat closed via desktop recovery (GRC). ".repeat(2);
  const r = await resolveThreatAction(tid, op, justification, op);
  if (!r.success) {
    return { success: false, error: "Resolution rejected (check justification length)." };
  }
  await prisma.agentOperation.updateMany({
    where: { threatId: tid, agentName: IRONTECH_AGENT_NAME },
    data: { status: AgentOperationStatus.COMPLETED, lastError: null },
  });
  await prisma.auditLog.create({
    data: {
      action: "MANUAL_RESOLUTION_AUTHORIZED",
      justification: `Desktop recovery: operator ${op} authorized closure after escalation.`,
      operatorId: op,
      threatId: tid,
    },
  });
  revalidatePath("/");
  return { success: true };
}

/**
 * Toggle remote access — **Admin/Owner (or IRONFRAME_REMOTE_ACCESS_ADMIN_EMAILS) + Supabase session only**.
 */
export async function toggleRemoteAccessAuthorization(
  threatId: string,
): Promise<
  { success: true; isRemoteAccessAuthorized: boolean } | { success: false; error: string }
> {
  const tid = threatId.trim();
  if (!tid) {
    return { success: false, error: "Missing threat id." };
  }
  let userId: string;
  try {
    userId = await requireSupabaseAdminOrOwnerForRemoteAccess();
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
  const row = await prisma.threatEvent.findUnique({
    where: { id: tid },
    select: { isRemoteAccessAuthorized: true },
  });
  if (!row) {
    return {
      success: false,
      error: `[toggleRemoteAccessAuthorization] threatEvent.findUnique: no row for ${tid}`,
    };
  }
  const next = !row.isRemoteAccessAuthorized;
  await updateThreatWithIntegrity({
    threatId: tid,
    changes: { isRemoteAccessAuthorized: next },
    actorUserId: userId,
    eventType: "REMOTE_ACCESS_AUTHORIZATION",
  });
  await prisma.auditLog.create({
    data: {
      action: "REMOTE_ACCESS_AUTHORIZATION",
      operatorId: userId,
      threatId: tid,
      justification: JSON.stringify({
        isRemoteAccessAuthorized: next,
        source: "dashboard_admin_owner",
      }),
    },
  });
  console.log(
    `> [GRC] Remote access ${next ? "granted" : "revoked"} by dashboard user ${userId.slice(0, 8)}…`,
  );
  revalidatePath("/");
  return { success: true, isRemoteAccessAuthorized: next };
}

/** Client: enable/disable Authorize Remote Access UI (server enforces the same rules). */
export async function getRemoteAccessAdminEligibility(): Promise<{ eligible: boolean }> {
  const eligible = await isRemoteAccessAdminEligible();
  return { eligible };
}

function parseSyntheticEmployeeIdFromIngestion(ingestionDetails: string | null | undefined): string | null {
  if (!ingestionDetails || !ingestionDetails.trim()) return null;
  try {
    const parsed = JSON.parse(ingestionDetails) as { syntheticEmployeeId?: unknown };
    if (typeof parsed.syntheticEmployeeId === "string" && parsed.syntheticEmployeeId.trim()) {
      return parsed.syntheticEmployeeId.trim();
    }
  } catch {
    return null;
  }
  return null;
}

async function resolveThreatTargetClearance(
  tx: Prisma.TransactionClient,
  threatId: string,
  targetEntity: string | null | undefined,
  ingestionDetails: string | null | undefined,
): Promise<number | null> {
  const syntheticEmployeeId = parseSyntheticEmployeeIdFromIngestion(ingestionDetails);
  if (syntheticEmployeeId) {
    const direct = await tx.syntheticEmployee.findUnique({
      where: { id: syntheticEmployeeId },
      select: { clearanceLevel: true },
    });
    if (typeof direct?.clearanceLevel === "number") {
      return direct.clearanceLevel;
    }
  }

  const normalizedTarget = typeof targetEntity === "string" ? targetEntity.trim() : "";
  if (!normalizedTarget) return null;

  const byEmail = await tx.syntheticEmployee.findFirst({
    where: { email: normalizedTarget },
    select: { clearanceLevel: true },
  });
  if (typeof byEmail?.clearanceLevel === "number") {
    return byEmail.clearanceLevel;
  }

  const fallbackThreat = await tx.threatEvent.findUnique({
    where: { id: threatId },
    select: { targetEntity: true },
  });
  const fallbackEmail = fallbackThreat?.targetEntity?.trim() ?? "";
  if (!fallbackEmail) return null;
  const fallback = await tx.syntheticEmployee.findFirst({
    where: { email: fallbackEmail },
    select: { clearanceLevel: true },
  });
  return typeof fallback?.clearanceLevel === "number" ? fallback.clearanceLevel : null;
}

export async function requestThreatResolution(
  threatId: string,
  resolutionNote: string,
  artifactId?: string,
): Promise<{ success: true; approvalId: string } | { success: false; error: string }> {
  const requestedId = threatId.trim();
  const note = resolutionNote.trim();
  if (!requestedId) return { success: false, error: "Missing threat id." };
  if (note.length < 10) {
    return { success: false, error: "Resolution note must be at least 10 characters." };
  }

  const user = await getSupabaseSessionUser();
  if (!user?.id?.trim()) {
    return { success: false, error: "Authentication required." };
  }
  const requestedByUserId = user.id.trim();

  try {
    const tid = await resolveThreatIdForResolutionRequest(requestedId);
    if (!tid) return { success: false, error: "Threat not found for this target." };

    const threat = await prisma.threatEvent.findUnique({
      where: { id: tid },
      select: { id: true, tenantCompanyId: true },
    });
    if (!threat) return { success: false, error: "Threat not found." };
    if (threat.tenantCompanyId == null) {
      return { success: false, error: "Threat is missing tenant company context." };
    }

    const company = await prisma.company.findUnique({
      where: { id: threat.tenantCompanyId },
      select: { tenantId: true },
    });
    if (!company?.tenantId) {
      return { success: false, error: "Unable to resolve tenant for threat." };
    }

    const normalizedArtifactId = artifactId?.trim() || "";

    const created = await prisma.$transaction(async (tx) => {
      const threatForClearance = await tx.threatEvent.findUnique({
        where: { id: tid },
        select: { targetEntity: true, ingestionDetails: true },
      });
      if (!threatForClearance) {
        throw new Error("Threat not found.");
      }

      const targetClearance = await resolveThreatTargetClearance(
        tx,
        tid,
        threatForClearance.targetEntity,
        threatForClearance.ingestionDetails,
      );
      if (targetClearance != null && targetClearance >= 4 && !normalizedArtifactId) {
        throw new Error("PROTOCOL_VIOLATION_EVIDENCE_REQUIRED");
      }

      const approval = await tx.threatApproval.create({
        data: {
          threatId: tid,
          tenantId: company.tenantId,
          status: "PENDING",
          requestedByUserId,
          approvalNote: note,
          approvalPayloadHash: null,
        },
        select: { id: true },
      });

      const ledgerEntry = await integrityService.logEvent(tx, {
        tenantId: company.tenantId,
        eventType: "THREAT_RESOLUTION_REQUESTED",
        entityType: "THREAT_APPROVAL",
        entityId: approval.id,
        actorUserId: requestedByUserId,
        payload: {
          threatId: tid,
          requestedByUserId,
          resolutionNote: note,
          artifactId: normalizedArtifactId || null,
        },
        source: EventSource.SYSTEM,
      });
      await tx.threatApproval.update({
        where: { id: approval.id },
        data: { approvalPayloadHash: ledgerEntry.payloadHash },
      });
      return approval;
    });
    if (normalizedArtifactId) {
      const attachment = await attachEvidenceToThreat(
        normalizedArtifactId,
        tid,
        `Resolution request linkage. approvalId:${created.id}`,
      );
      if (!attachment.success) {
        await prisma.threatApproval.delete({ where: { id: created.id } });
        return { success: false, error: attachment.error };
      }
    }

    revalidatePath("/");
    return { success: true, approvalId: created.id as string };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to request resolution.";
    return { success: false, error: message };
  }
}

export async function approveThreatResolution(
  approvalId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const aid = approvalId.trim();
  if (!aid) return { success: false, error: "Missing approval id." };

  const user = await getSupabaseSessionUser();
  const approverUserId = user?.id?.trim() ?? "";
  if (!approverUserId) {
    return { success: false, error: "Authentication required." };
  }

  try {
    const approval = await prisma.threatApproval.findUnique({
      where: { id: aid },
      select: {
        id: true,
        status: true,
        tenantId: true,
        threatId: true,
        threat: {
          select: {
            id: true,
            targetEntity: true,
            ingestionDetails: true,
          },
        },
      },
    });
    if (!approval) return { success: false, error: "Approval record not found." };

    const roleAssignment = await prisma.userRoleAssignment.findFirst({
      where: {
        userId: approverUserId,
        tenantId: approval.tenantId,
        role: { in: [...THREAT_RESOLUTION_APPROVER_ROLES] },
      },
      select: { id: true },
    });
    if (!roleAssignment) {
      return {
        success: false,
        error: "Only GRC_MANAGER, GLOBAL_ADMIN, CISO, or DIRECTOR_OF_COMPLIANCE can approve.",
      };
    }

    if (approval.status === "APPROVED") {
      return { success: true };
    }

    const syntheticEmployeeId = parseSyntheticEmployeeIdFromIngestion(
      approval.threat?.ingestionDetails ?? null,
    );

    await prisma.$transaction(async (tx) => {
      const targetClearance = await resolveThreatTargetClearance(
        tx,
        approval.threatId as string,
        approval.threat?.targetEntity,
        approval.threat?.ingestionDetails,
      );
      const evidenceAttachment = await tx.evidenceAttachment.findFirst({
        where: {
          tenantId: approval.tenantId,
          entityType: "THREAT_EVENT",
          entityId: approval.threatId as string,
        },
        select: { id: true },
      });
      if (targetClearance != null && targetClearance >= 4 && !evidenceAttachment) {
        throw new Error("PROTOCOL_VIOLATION_EVIDENCE_REQUIRED");
      }

      await tx.threatApproval.update({
        where: { id: aid },
        data: {
          status: "APPROVED",
          approvedByUserId: approverUserId,
          approvedAt: new Date(),
        },
      });

      await updateThreatWithIntegrity({
        threatId: approval.threatId as string,
        changes: ({ resolutionApprovalId: aid } as Prisma.ThreatEventUpdateInput),
        actorUserId: approverUserId,
        eventType: "THREAT_RESOLUTION_LINKED_APPROVAL",
        tx,
      });

      if (syntheticEmployeeId) {
        await tx.syntheticEmployee.update({
          where: { id: syntheticEmployeeId },
          data: {
            isBreached: false,
            status: "PROTECTED",
          },
        });
      } else if (typeof approval.threat?.targetEntity === "string" && approval.threat.targetEntity.trim()) {
        await tx.syntheticEmployee.updateMany({
          where: { email: approval.threat.targetEntity.trim() },
          data: {
            isBreached: false,
            status: "PROTECTED",
          },
        });
      }

      await integrityService.createLedgerEntry(tx, {
        tenantId: approval.tenantId as string,
        eventType: "THREAT_RESOLUTION_APPROVED",
        entityType: "THREAT_APPROVAL",
        entityId: aid,
        actorUserId: approverUserId,
        payload: {
          threatId: approval.threatId,
          approvedByUserId: approverUserId,
        },
        source: EventSource.SYSTEM,
      });
    });

    revalidatePath("/");
    revalidatePath("/integrity");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve resolution.";
    return { success: false, error: message };
  }
}

const HANDSHAKE_ROLE_COOKIE = "ironframe-handshake-role";

function isKimbotSimulationIngestion(ingestionDetails: string | null | undefined, sourceAgent: string): boolean {
  const src = (sourceAgent ?? "").toUpperCase();
  if (src.includes("KIMBOT")) return true;
  try {
    const j = JSON.parse(ingestionDetails ?? "{}") as Record<string, unknown>;
    if (j?.simulator === "KIMBOT" || j?.simulator === "ATTBOT") return true;
    if (j?.category === "SIMULATION") return true;
  } catch {
    /* ignore */
  }
  return false;
}

async function actorMayAttestAsCiso(
  userId: string,
  tenantUuid: string,
  handshakeRaw: string | undefined,
): Promise<boolean> {
  if ((handshakeRaw ?? "").trim().toUpperCase() === "CISO") return true;
  const row = await prisma.userRoleAssignment.findFirst({
    where: {
      userId,
      tenantId: tenantUuid,
      role: { in: ["CISO", "GRC_MANAGER"] },
    },
    select: { id: true },
  });
  return row != null;
}

/**
 * Lab / handshake: CISO attestation that primes `resolutionApprovalId` so an ADMIN-class operator can Resolve (Epic 11).
 * Shadow plane stores attestation on `ingestionDetails.shadowCisoHandshake`; prod uses `ThreatApproval` + link.
 */
export async function generateCisoApproval(
  threatId: string,
): Promise<{ success: true; approvalId: string } | { success: false; error: string }> {
  const tid = threatId.trim();
  if (!tid) return { success: false, error: "Missing threat id." };

  const user = await getSupabaseSessionUser();
  const uid = user?.id?.trim() ?? "";
  if (!uid) return { success: false, error: "Authentication required." };

  const jar = await cookies();
  const handshakeRole = jar.get(HANDSHAKE_ROLE_COOKIE)?.value;

  try {
    const sim = await readSimulationPlaneEnabled();
    if (sim) {
      const row = await prisma.simThreatEvent.findUnique({
        where: { id: tid },
        select: { id: true, ingestionDetails: true, sourceAgent: true, tenantCompanyId: true },
      });
      if (!row) return { success: false, error: "Shadow threat not found." };
      if (!row.tenantCompanyId) {
        return { success: false, error: "Shadow threat is missing tenant company context." };
      }
      const company = await prisma.company.findUnique({
        where: { id: row.tenantCompanyId },
        select: { tenantId: true },
      });
      if (!company?.tenantId) return { success: false, error: "Unable to resolve tenant for shadow threat." };
      const may = await actorMayAttestAsCiso(uid, company.tenantId, handshakeRole);
      if (!may) {
        return {
          success: false,
          error: "CISO identity required: use Control Room [CISO] or sign in with a CISO/GRC_MANAGER assignment.",
        };
      }
      const approvalId = `shadow-ciso-${randomUUID()}`;
      const secret =
        process.env.HANDSHAKE_ATTESTATION_SECRET?.trim() ||
        process.env.PRIVATE_KEY?.trim()?.slice(0, 48) ||
        "ironframe-dev-handshake-attestation";
      const attestationSignature = createHmac("sha256", secret)
        .update(`${tid}:${approvalId}:${uid}`)
        .digest("hex");
      const merged = mergeIngestionDetailsPatch(row.ingestionDetails ?? null, {
        shadowCisoHandshake: {
          resolutionApprovalId: approvalId,
          resolutionApprovalStatus: "APPROVED",
          approvedByUserId: uid,
          approvedAt: new Date().toISOString(),
          attestationSignature,
        },
      });
      await prisma.simThreatEvent.update({
        where: { id: tid },
        data: { ingestionDetails: merged },
      });
      revalidatePath("/");
      return { success: true, approvalId };
    }

    const threat = await prisma.threatEvent.findUnique({
      where: { id: tid },
      select: {
        id: true,
        tenantCompanyId: true,
        sourceAgent: true,
        ingestionDetails: true,
        resolutionApprovalId: true,
        targetEntity: true,
      },
    });
    if (!threat) return { success: false, error: "Threat not found." };
    if (threat.tenantCompanyId == null) {
      return { success: false, error: "Threat is missing tenant company context." };
    }
    const company = await prisma.company.findUnique({
      where: { id: threat.tenantCompanyId },
      select: { tenantId: true },
    });
    if (!company?.tenantId) return { success: false, error: "Unable to resolve tenant for threat." };

    const may = await actorMayAttestAsCiso(uid, company.tenantId, handshakeRole);
    if (!may) {
      return {
        success: false,
        error: "CISO identity required: use Control Room [CISO] or sign in with a CISO/GRC_MANAGER assignment.",
      };
    }

    if (threat.resolutionApprovalId) {
      const existing = await prisma.threatApproval.findUnique({
        where: { id: threat.resolutionApprovalId },
        select: { id: true, status: true },
      });
      if (existing?.status === "APPROVED") {
        return { success: true, approvalId: existing.id };
      }
    }

    const skipEvidenceForSimKimbot = isKimbotSimulationIngestion(threat.ingestionDetails, threat.sourceAgent);

    const approvalIdOut = await prisma.$transaction(async (tx) => {
      if (!skipEvidenceForSimKimbot) {
        const targetClearance = await resolveThreatTargetClearance(
          tx,
          tid,
          threat.targetEntity,
          threat.ingestionDetails,
        );
        const evidenceAttachment = await tx.evidenceAttachment.findFirst({
          where: {
            tenantId: company.tenantId,
            entityType: "THREAT_EVENT",
            entityId: tid,
          },
          select: { id: true },
        });
        if (targetClearance != null && targetClearance >= 4 && !evidenceAttachment) {
          throw new Error("PROTOCOL_VIOLATION_EVIDENCE_REQUIRED");
        }
      }

      const approval = await tx.threatApproval.create({
        data: {
          threatId: tid,
          tenantId: company.tenantId,
          status: "APPROVED",
          requestedByUserId: uid,
          approvedByUserId: uid,
          approvedAt: new Date(),
          approvalNote: "CISO handshake attestation (generateCisoApproval).",
          approvalPayloadHash: null,
        },
        select: { id: true },
      });

      const ledgerEntry = await integrityService.logEvent(tx, {
        tenantId: company.tenantId,
        eventType: "THREAT_RESOLUTION_APPROVED",
        entityType: "THREAT_APPROVAL",
        entityId: approval.id,
        actorUserId: uid,
        payload: {
          threatId: tid,
          handshake: "generateCisoApproval",
        },
        source: EventSource.SYSTEM,
      });

      await tx.threatApproval.update({
        where: { id: approval.id },
        data: { approvalPayloadHash: ledgerEntry.payloadHash },
      });

      await updateThreatWithIntegrity({
        threatId: tid,
        changes: { resolutionApprovalId: approval.id } as Prisma.ThreatEventUpdateInput,
        actorUserId: uid,
        eventType: "THREAT_RESOLUTION_LINKED_APPROVAL",
        tx,
      });

      const syntheticEmployeeId = parseSyntheticEmployeeIdFromIngestion(threat.ingestionDetails);
      if (syntheticEmployeeId) {
        await tx.syntheticEmployee.update({
          where: { id: syntheticEmployeeId },
          data: { isBreached: false, status: "PROTECTED" },
        });
      } else {
        const email = typeof threat.targetEntity === "string" ? threat.targetEntity.trim() : "";
        if (email) {
          await tx.syntheticEmployee.updateMany({
            where: { email },
            data: { isBreached: false, status: "PROTECTED" },
          });
        }
      }
      return approval.id;
    });

    revalidatePath("/");
    revalidatePath("/integrity");
    return { success: true, approvalId: approvalIdOut };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate CISO approval.";
    return { success: false, error: message };
  }
}

/**
 * Kimbot System Integrity drill: CISO step — persist vault manifest URL, shadow handshake (sim) or
 * approved ThreatApproval + IntegrityEvent (prod), so Admin can execute resolution without GRC_PROTOCOL_VIOLATION.
 */
export async function generateSimulationApproval(
  threatId: string,
): Promise<{ success: true; approvalId: string } | { success: false; error: string }> {
  const tid = threatId.trim();
  if (!tid) return { success: false, error: "Missing threat id." };

  const user = await getSupabaseSessionUser();
  const uid = user?.id?.trim() ?? "";
  if (!uid) return { success: false, error: "Authentication required." };

  const jar = await cookies();
  const handshakeRole = jar.get(HANDSHAKE_ROLE_COOKIE)?.value;

  try {
    const sim = await readSimulationPlaneEnabled();
    if (sim) {
      const row = await prisma.simThreatEvent.findUnique({
        where: { id: tid },
        select: { id: true, title: true, ingestionDetails: true, tenantCompanyId: true },
      });
      if (!row) return { success: false, error: "Shadow threat not found." };
      if (
        !isSystemIntegrityKimbotDrillThreatOnServer({
          title: row.title,
          ingestionDetails: row.ingestionDetails,
        })
      ) {
        return {
          success: false,
          error:
          "Simulation authorization applies only to Kimbot, Grcbot, or Attbot System Integrity drill cards.",
        };
      }
      if (!row.tenantCompanyId) {
        return { success: false, error: "Shadow threat is missing tenant company context." };
      }
      const company = await prisma.company.findUnique({
        where: { id: row.tenantCompanyId },
        select: { tenantId: true },
      });
      if (!company?.tenantId) return { success: false, error: "Unable to resolve tenant for shadow threat." };
      const may = await actorMayAttestAsCiso(uid, company.tenantId, handshakeRole);
      if (!may) {
        return {
          success: false,
          error: "CISO identity required: use Control Room [CISO] or sign in with a CISO/GRC_MANAGER assignment.",
        };
      }
      const prev = parseShadowHandshakeApproval(row.ingestionDetails);
      if (
        prev.resolutionApprovalStatus === "APPROVED" &&
        prev.resolutionApprovalId &&
        ingestionHasVaultSimManifest(row.ingestionDetails)
      ) {
        return { success: true, approvalId: prev.resolutionApprovalId };
      }
      const manifestToken = randomUUID();
      const approvalId = `sim-ciso-${manifestToken}`;
      const secret =
        process.env.HANDSHAKE_ATTESTATION_SECRET?.trim() ||
        process.env.PRIVATE_KEY?.trim()?.slice(0, 48) ||
        "ironframe-dev-handshake-attestation";
      const attestationSignature = createHmac("sha256", secret)
        .update(`${tid}:${approvalId}:${uid}`)
        .digest("hex");
      const merged = mergeIngestionDetailsPatch(row.ingestionDetails ?? null, {
        evidenceLink: SIM_MANIFEST_EVIDENCE_URL,
        shadowCisoHandshake: {
          resolutionApprovalId: approvalId,
          resolutionApprovalStatus: "APPROVED",
          approvedByUserId: uid,
          approvedAt: new Date().toISOString(),
          attestationSignature,
          simulationAuthorization: true,
        },
      });
      await prisma.$transaction(async (tx) => {
        await tx.simThreatEvent.update({
          where: { id: tid },
          data: { ingestionDetails: merged },
        });
        await integrityService.logEvent(tx, {
          tenantId: company.tenantId,
          eventType: GRC_CISO_SIMULATION_AUTH_EVENT,
          entityType: "THREAT_EVENT",
          entityId: tid,
          actorUserId: uid,
          payload: {
            threatId: tid,
            evidenceLink: SIM_MANIFEST_EVIDENCE_URL,
            shadowPlane: true,
          },
          source: EventSource.SYSTEM,
        });
      });
      revalidatePath("/");
      return { success: true, approvalId };
    }

    const threat = await prisma.threatEvent.findUnique({
      where: { id: tid },
      select: {
        id: true,
        title: true,
        tenantCompanyId: true,
        sourceAgent: true,
        ingestionDetails: true,
        resolutionApprovalId: true,
        targetEntity: true,
      },
    });
    if (!threat) return { success: false, error: "Threat not found." };
    if (threat.tenantCompanyId == null) {
      return { success: false, error: "Threat is missing tenant company context." };
    }
    if (
      !isSystemIntegrityKimbotDrillThreatOnServer({
        title: threat.title,
        ingestionDetails: threat.ingestionDetails,
      })
    ) {
      return {
        success: false,
        error:
          "Simulation authorization applies only to Kimbot, Grcbot, or Attbot System Integrity drill cards.",
      };
    }
    const company = await prisma.company.findUnique({
      where: { id: threat.tenantCompanyId },
      select: { tenantId: true },
    });
    if (!company?.tenantId) return { success: false, error: "Unable to resolve tenant for threat." };

    const may = await actorMayAttestAsCiso(uid, company.tenantId, handshakeRole);
    if (!may) {
      return {
        success: false,
        error: "CISO identity required: use Control Room [CISO] or sign in with a CISO/GRC_MANAGER assignment.",
      };
    }

    if (threat.resolutionApprovalId) {
      const existing = await prisma.threatApproval.findUnique({
        where: { id: threat.resolutionApprovalId },
        select: { id: true, status: true },
      });
      if (existing?.status === "APPROVED") {
        return { success: true, approvalId: existing.id };
      }
    }

    const mergedIngestionBase = mergeIngestionDetailsPatch(threat.ingestionDetails ?? null, {
      evidenceLink: SIM_MANIFEST_EVIDENCE_URL,
    });

    const skipEvidenceGate =
      isKimbotSimulationIngestion(threat.ingestionDetails, threat.sourceAgent) ||
      isSystemIntegrityKimbotDrillThreatOnServer({
        title: threat.title,
        ingestionDetails: threat.ingestionDetails,
      });

    const approvalIdOut = await prisma.$transaction(async (tx) => {
      if (!skipEvidenceGate) {
        const targetClearance = await resolveThreatTargetClearance(
          tx,
          tid,
          threat.targetEntity,
          threat.ingestionDetails,
        );
        const evidenceAttachment = await tx.evidenceAttachment.findFirst({
          where: {
            tenantId: company.tenantId,
            entityType: "THREAT_EVENT",
            entityId: tid,
          },
          select: { id: true },
        });
        if (targetClearance != null && targetClearance >= 4 && !evidenceAttachment) {
          throw new Error("PROTOCOL_VIOLATION_EVIDENCE_REQUIRED");
        }
      }

      const approval = await tx.threatApproval.create({
        data: {
          threatId: tid,
          tenantId: company.tenantId,
          status: "APPROVED",
          requestedByUserId: uid,
          approvedByUserId: uid,
          approvedAt: new Date(),
          approvalNote: "CISO simulation authorization (generateSimulationApproval).",
          approvalPayloadHash: null,
        },
        select: { id: true },
      });

      const ledgerEntry = await integrityService.logEvent(tx, {
        tenantId: company.tenantId,
        eventType: GRC_CISO_SIMULATION_AUTH_EVENT,
        entityType: "THREAT_EVENT",
        entityId: tid,
        actorUserId: uid,
        payload: {
          threatId: tid,
          approvalId: approval.id,
          evidenceLink: SIM_MANIFEST_EVIDENCE_URL,
        },
        source: EventSource.SYSTEM,
      });

      await tx.threatApproval.update({
        where: { id: approval.id },
        data: { approvalPayloadHash: ledgerEntry.payloadHash },
      });

      await updateThreatWithIntegrity({
        threatId: tid,
        changes: {
          resolutionApprovalId: approval.id,
          ingestionDetails: mergedIngestionBase,
        } as Prisma.ThreatEventUpdateInput,
        actorUserId: uid,
        eventType: "THREAT_RESOLUTION_LINKED_APPROVAL",
        tx,
      });

      return approval.id;
    });

    revalidatePath("/");
    revalidatePath("/integrity");
    return { success: true, approvalId: approvalIdOut };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate simulation authorization.";
    return { success: false, error: message };
  }
}

export type PendingThreatResolutionItem = {
  approvalId: string;
  threatId: string;
  threatTitle: string;
  targetEntity: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedByUserId: string;
  approvalNote: string;
  createdAt: string;
};

async function resolveThreatIdForResolutionRequest(inputId: string): Promise<string | null> {
  const direct = await prisma.threatEvent.findUnique({
    where: { id: inputId },
    select: { id: true },
  });
  if (direct?.id) return direct.id;

  const synthetic = await prisma.syntheticEmployee.findUnique({
    where: { id: inputId },
    select: { email: true },
  });
  const email = typeof synthetic?.email === "string" ? synthetic.email.trim() : "";
  if (!email) return null;

  const linked = await prisma.threatEvent.findFirst({
    where: { targetEntity: email },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return linked?.id ?? null;
}

export async function listPendingThreatResolutions(): Promise<
  { ok: true; items: PendingThreatResolutionItem[] } | { ok: false; error: string; items: [] }
> {
  try {
    const rows = await prisma.threatApproval.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        threatId: true,
        status: true,
        requestedByUserId: true,
        approvalNote: true,
        createdAt: true,
        threat: {
          select: {
            title: true,
            targetEntity: true,
          },
        },
      },
    });
    return {
      ok: true,
      items: rows.map((row) => ({
        approvalId: row.id,
        threatId: row.threatId,
        threatTitle: row.threat?.title ?? row.threatId,
        targetEntity: row.threat?.targetEntity ?? null,
        status: row.status,
        requestedByUserId: row.requestedByUserId,
        approvalNote: row.approvalNote ?? "",
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date().toISOString(),
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load pending resolutions.";
    return { ok: false, error: message, items: [] };
  }
}

export async function getThreatResolutionReviewEligibility(): Promise<{ eligible: boolean }> {
  const user = await getSupabaseSessionUser();
  const uid = user?.id?.trim() ?? "";
  if (!uid) return { eligible: false };

  const assignment = await prisma.userRoleAssignment.findFirst({
    where: {
      userId: uid,
      role: { in: [...THREAT_RESOLUTION_APPROVER_ROLES] },
    },
    select: { id: true },
  });
  return { eligible: Boolean(assignment?.id) };
}

export async function rejectThreatResolution(
  approvalId: string,
  rejectionNote?: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const aid = approvalId.trim();
  if (!aid) return { success: false, error: "Missing approval id." };

  const user = await getSupabaseSessionUser();
  const approverUserId = user?.id?.trim() ?? "";
  if (!approverUserId) return { success: false, error: "Authentication required." };

  try {
    const approval = await prisma.threatApproval.findUnique({
      where: { id: aid },
      select: { id: true, tenantId: true, status: true, approvalNote: true },
    });
    if (!approval) return { success: false, error: "Approval record not found." };

    const roleAssignment = await prisma.userRoleAssignment.findFirst({
      where: {
        userId: approverUserId,
        tenantId: approval.tenantId,
        role: { in: [...THREAT_RESOLUTION_APPROVER_ROLES] },
      },
      select: { id: true },
    });
    if (!roleAssignment) {
        return {
          success: false,
          error: "Only GRC_MANAGER, GLOBAL_ADMIN, CISO, or DIRECTOR_OF_COMPLIANCE can reject.",
        };
    }

    const note =
      typeof rejectionNote === "string" && rejectionNote.trim()
        ? `${approval.approvalNote}\n\n[REJECTED] ${rejectionNote.trim()}`
        : approval.approvalNote;

    await prisma.$transaction(async (tx) => {
      await tx.threatApproval.update({
        where: { id: aid },
        data: {
          status: "REJECTED",
          approvedByUserId: approverUserId,
          approvedAt: new Date(),
          approvalNote: note,
        },
      });
      await integrityService.logEvent(tx, {
        tenantId: approval.tenantId,
        eventType: "THREAT_RESOLUTION_REJECTED",
        entityType: "THREAT_APPROVAL",
        entityId: aid,
        actorUserId: approverUserId,
        payload: {
          approvalId: aid,
          approvedByUserId: approverUserId,
          note,
        },
        source: EventSource.SYSTEM,
      });
    });

    revalidatePath("/");
    revalidatePath("/integrity");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reject resolution.";
    return { success: false, error: message };
  }
}

