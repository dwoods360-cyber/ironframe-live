export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore, revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { acknowledgeThreatAction } from '@/app/actions/threatActions';
import { mergeIngestionDetailsPatch, mergeIngestionDetailsPatchJson, parseIngestionDetailsForMerge } from '@/app/utils/ingestionDetailsMerge';
import { markOperationalDeficiencyReportPromotedToThreat } from '@/app/lib/opsupport/markDeficiencyPromoted';
import { grcGatePass } from '@/app/utils/grcGate';
import { getActiveTenantUuidFromCookies, isValidTenantUuid } from '@/app/utils/serverTenantContext';
import { isShadowPlaneActiveFromEnv } from '@/app/utils/shadowPlaneActive';
import { TENANT_UUIDS } from '@/app/utils/tenantIsolation';
import { ingressUsesRiskEventTable } from '@/app/lib/security/ingressGateway';
import { chaosAcknowledgeBlockedByDiscoveryHold } from '@/app/utils/chaosDiscoveryHold';
import {
  ingestOrchestrationBusDisabled,
  invokeIngestOrchestrationBus,
} from '@/src/services/orchestration/ingestBusBridge';
import {
  ingressSanitizerFailureResponse,
  sanitizeIngressPayload,
} from '@/app/lib/ironethic/ingressSanitizer';

/** Canonical Medshield tenant UUID — aligns bot writes with default dev session / terminal logs when env shadow has no cookie. */
const SHADOW_PLANE_DEFAULT_TENANT_UUID = TENANT_UUIDS.medshield;

function shadowPlaneActive(request: NextRequest): boolean {
  if (isShadowPlaneActiveFromEnv()) return true;
  if (request.cookies.get('ironframe-simulation-mode')?.value === '1') return true;
  const hdr = request.headers.get('x-shadow-plane-active')?.trim().toLowerCase();
  return hdr === '1' || hdr === 'true' || hdr === 'yes';
}

/** Same-origin bots / CLI — prefer header over body so writes align with `GET /api/dashboard` Ironguard scope. */
function tenantUuidFromHeader(request: NextRequest): string | null {
  const raw = request.headers.get('x-tenant-id')?.trim();
  return raw && isValidTenantUuid(raw) ? raw : null;
}

function isChaosLikeIngestion(parsed: Record<string, unknown>, botIngest: boolean): boolean {
  const et = String(parsed.entityType ?? '').toUpperCase();
  const chaosLevel = parsed.chaos_level;
  const levelNum =
    typeof chaosLevel === 'number' && Number.isFinite(chaosLevel)
      ? chaosLevel
      : typeof chaosLevel === 'string'
        ? Number.parseInt(chaosLevel.trim(), 10)
        : NaN;
  return (
    botIngest ||
    parsed.isChaosTest === true ||
    parsed.incident_type === 'CHAOS' ||
    (Number.isFinite(levelNum) && levelNum >= 1 && levelNum <= 5) ||
    et.includes('CHAOS')
  );
}

/** KIM / GRC / Attbot-style callers — stamp tenant from session for RLS + pipeline (shadow plane). */
function isAdversarialBotIngestPayload(body: Record<string, unknown>): boolean {
  const op = String(body.operatorId ?? '').toUpperCase();
  const src = String(body.sourceAgent ?? body.botSignature ?? '').toUpperCase();
  const blob = JSON.stringify(body).toUpperCase();
  if (/KIMBOT|GRC_BOT|GRCBOT|ATTACK_BOT|ATTBOT|IRONTECH|IRONCHAOS|CHAOS_DRILL|CHAOS\b|\bKIM\b|\bGRC\b|\bATT\b/.test(op))
    return true;
  if (/KIMBOT|GRC_BOT|ATTACK_BOT|ATTBOT|IRONTECH|IRONCHAOS|INFILBOT|PHISHBOT/.test(src)) return true;
  if (
    /KIMBOT|GRC_BOT|\[GRC\]|\[ATTACK\]|\[KIM|CHAOS_DRILL|ISCHAOSTEST|ENTITYTYPE|CHAOSSCENARIO|IRONTECH|IRONCHAOS/.test(
      blob,
    )
  )
    return true;
  return false;
}

/**
 * Acknowledgement POST for an **existing** `ThreatEvent` row (`threatId` in body). Chaos Levels 1–5 **creation**
 * flows through `chaosActions` → `ingressGateway.writeThreatEvent`, which stamps Medshield (or session tenant),
 * `ThreatState.IDENTIFIED`, and `ingestionDetails` (`incident_type: CHAOS`, `category: INFRASTRUCTURE`,
 * `shadowSimulationStatus`, `chaos_level`, etc.).
 *
 * Shadow plane + bot passport: middleware bypasses Ironguard 403 when SHADOW_PLANE_ACTIVE or simulation cookie;
 * tenant resolution prefers `x-tenant-id`, then session cookie, then `SHADOW_PLANE_INGEST_TENANT_UUID`, then Medshield.
 * Persistence: `acknowledgeThreatAction` writes ACK state + AuditLog server-side.
 *
 * Epic 10.5: After acknowledgement, eligible requests invoke `compileSovereignOrchestrationBus`
 * (Ironcore → Ironscribe → Ironsight → Ironquery → Ironlock/Ironcast). Set `skipOrchestrationBus: true`
 * or `IRONFRAME_INGEST_BUS_DISABLED=1` to bypass.
 */
export async function POST(request: NextRequest) {
  noStore();
  try {
    let body: Record<string, unknown>;
    try {
      body = sanitizeIngressPayload(
        (await request.json().catch(() => ({}))) as Record<string, unknown>,
      );
    } catch (sanitizeErr) {
      const pepperFailure = ingressSanitizerFailureResponse(sanitizeErr);
      if (pepperFailure) {
        return NextResponse.json(pepperFailure.body, { status: pepperFailure.status });
      }
      throw sanitizeErr;
    }
    const threatId = typeof body.threatId === 'string' ? body.threatId.trim() : null;
    const bodyTenantRaw = typeof body.tenantId === 'string' ? body.tenantId.trim() : null;
    const bodyTenant = bodyTenantRaw && isValidTenantUuid(bodyTenantRaw) ? bodyTenantRaw : null;
    let tenantId = bodyTenant;
    const headerTenant = tenantUuidFromHeader(request);
    const shadow = shadowPlaneActive(request);
    const botIngest = isAdversarialBotIngestPayload(body);
    /**
     * Shadow plane bot passport — align with KIM/Attbot/Chaos: **`x-tenant-id` first** (bot-declared scope),
     * then body `tenantId`, session cookie, env pin, then Medshield default — RLS must see a real tenant UUID.
     */
    if (isShadowPlaneActiveFromEnv()) {
      const sessionTenant = await getActiveTenantUuidFromCookies();
      tenantId =
        headerTenant ||
        tenantId ||
        sessionTenant ||
        process.env.SHADOW_PLANE_INGEST_TENANT_UUID?.trim() ||
        SHADOW_PLANE_DEFAULT_TENANT_UUID;
    } else if (shadow) {
      tenantId =
        headerTenant ||
        tenantId ||
        (await getActiveTenantUuidFromCookies()) ||
        (botIngest ? SHADOW_PLANE_DEFAULT_TENANT_UUID : null);
    } else {
      tenantId = headerTenant || tenantId || (await getActiveTenantUuidFromCookies());
    }
    if (!tenantId && botIngest) {
      tenantId =
        headerTenant ||
        bodyTenant ||
        (await getActiveTenantUuidFromCookies()) ||
        process.env.SHADOW_PLANE_INGEST_TENANT_UUID?.trim() ||
        SHADOW_PLANE_DEFAULT_TENANT_UUID;
    }
    const justification = typeof body.justification === 'string' ? body.justification : undefined;
    const operatorId = typeof body.operatorId === 'string' ? body.operatorId.trim() : 'api-user';

    if (!threatId) {
      return NextResponse.json(
        { error: 'Missing threatId in request body.' },
        { status: 400 }
      );
    }
    if (!tenantId) {
      return NextResponse.json(
        {
          error:
            'Missing tenant scope: provide tenantId in body or set ironframe-tenant cookie (Dev Tenant Switcher).',
        },
        { status: 400 },
      );
    }

    const threat = await (async () => {
      const useRisk = await ingressUsesRiskEventTable();
      if (useRisk) {
        return prisma.riskEvent.findFirst({
          where: { id: threatId },
          select: {
            financialRisk_cents: true,
            status: true,
            createdAt: true,
            ingestionDetails: true,
            targetEntity: true,
          },
        });
      }
      return prisma.threatEvent.findUnique({
        where: { id: threatId },
        select: {
          financialRisk_cents: true,
          status: true,
          createdAt: true,
          ingestionDetails: true,
          targetEntity: true,
        },
      });
    })();

    if (!threat) {
      return NextResponse.json(
        { error: 'Threat not found.' },
        { status: 404 }
      );
    }

    const discoveryHold = chaosAcknowledgeBlockedByDiscoveryHold({
      status: String(threat.status),
      ingestionDetails: threat.ingestionDetails,
      industry: threat.targetEntity,
      createdAt: threat.createdAt,
    });
    if (discoveryHold.blocked) {
      return NextResponse.json(
        {
          error: `Chaos discovery phase: signal must stay in Risk Velocity (${Math.ceil(discoveryHold.retryAfterMs / 1000)}s remaining) before Active promotion.`,
          code: 'CHAOS_DISCOVERY_HOLD',
          retryAfterMs: discoveryHold.retryAfterMs,
        },
        { status: 425 },
      );
    }

    const cents = BigInt(threat.financialRisk_cents ?? 0);
    const skipGrcGate = shadow && botIngest;
    if (!skipGrcGate && !grcGatePass(cents, justification ?? '')) {
      return NextResponse.json(
        { error: 'GRC Violation: High-value threats require a 50+ character justification.' },
        { status: 400 }
      );
    }

    /**
     * Chaos / bot: 4s “discovery” hold **after** persisting a non-promoting ingestion stamp, **before**
     * `acknowledgeThreatAction` (IDENTIFIED/velocity → CONFIRMED / Active board).
     */
    const parsedForActiveHold = parseIngestionDetailsForMerge(threat.ingestionDetails ?? null) as Record<
      string,
      unknown
    >;
    const chaosLikeForHold = isChaosLikeIngestion(parsedForActiveHold, botIngest);
    if (chaosLikeForHold) {
      const holdIso = new Date().toISOString();
      const useRiskTable = await ingressUsesRiskEventTable();
      try {
        if (useRiskTable) {
          const rowIngest = await prisma.riskEvent.findFirst({
            where: { id: threatId },
            select: { tenantId: true, ingestionDetails: true },
          });
          if (rowIngest?.tenantId) {
            const mergedHold = mergeIngestionDetailsPatchJson(rowIngest.ingestionDetails ?? null, {
              discoveryIngestHoldStartedAt: holdIso,
              riskVelocityDiscoveryHold: true,
            });
            await prisma.riskEvent.updateMany({
              where: { id: threatId, tenantId: rowIngest.tenantId },
              data: { ingestionDetails: mergedHold },
            });
          }
        } else {
          const te = await prisma.threatEvent.findUnique({
            where: { id: threatId },
            select: { ingestionDetails: true },
          });
          const mergedHold = mergeIngestionDetailsPatch(te?.ingestionDetails ?? null, {
            discoveryIngestHoldStartedAt: holdIso,
            riskVelocityDiscoveryHold: true,
          });
          await prisma.threatEvent.updateMany({
            where: { id: threatId },
            data: { ingestionDetails: mergedHold },
          });
        }
      } catch (stampErr) {
        console.warn("[api/threats/ingest] discovery hold stamp failed", stampErr);
      }
      await new Promise<void>((r) => setTimeout(r, 4000));
    }

    const result = await acknowledgeThreatAction(threatId, tenantId, operatorId, justification, {
      shadowPlaneIngestBot: shadow && botIngest,
    });

    if (result && typeof result === 'object' && 'success' in result && result.success === false) {
      const r = result as {
        error?: string;
        chaosDiscoveryHold?: true;
        retryAfterMs?: number;
      };
      if (r.chaosDiscoveryHold === true && typeof r.retryAfterMs === 'number') {
        return NextResponse.json(
          {
            error: r.error ?? 'Chaos discovery hold.',
            code: 'CHAOS_DISCOVERY_HOLD',
            retryAfterMs: r.retryAfterMs,
          },
          { status: 425 },
        );
      }
      return NextResponse.json(
        { error: r.error ?? 'Acknowledge failed.' },
        { status: 400 }
      );
    }

    /** Velocity → Active: stamp promoted signal / deficiency queue rows once this threat is acknowledged into Active work. */
    const promotedSignalId =
      typeof body.sourceSignalId === 'string'
        ? body.sourceSignalId.trim()
        : typeof body.signalId === 'string'
          ? body.signalId.trim()
          : '';
    const deficiencyReportId =
      typeof body.deficiencyReportId === 'string' ? body.deficiencyReportId.trim() : '';

    try {
      if (promotedSignalId) {
        const te = await prisma.threatEvent.findUnique({
          where: { id: threatId },
          select: { ingestionDetails: true },
        });
        const merged = mergeIngestionDetailsPatch(te?.ingestionDetails ?? null, {
          promotedFromSignalId: promotedSignalId,
          signalVelocityLifecycle: 'promoted',
          riskVelocitySignalStatus: 'promoted',
          /** Product “Active Risk” — DB uses `ThreatState.CONFIRMED` / MITIGATED (ack path promotes IDENTIFIED → CONFIRMED). */
          commandCenterLifecycle: 'ACTIVE_RISK',
        });
        await prisma.threatEvent.updateMany({
          where: { id: threatId },
          data: { ingestionDetails: merged },
        });
      }
      if (deficiencyReportId) {
        await markOperationalDeficiencyReportPromotedToThreat(tenantId, deficiencyReportId, threatId);
      }
    } catch (stampErr) {
      console.warn('[api/threats/ingest] promotion stamp failed', stampErr);
    }

    /** Chaos / bot ingest: hard-bind `User_00` on row + JSON (`assigned_to` / owner) for Active-board filters (ThreatEvent + SimThreatEvent). */
    try {
      const useRiskForChaos = await ingressUsesRiskEventTable();
      const chaosPatch = {
        assigned_to: 'User_00',
        owner_id: 'User_00',
        constitutionalAuthority: 'User_00',
        constitutionalAuthorityMeta: {
          role: 'CONSTITUTIONAL_AUTHORITY',
          sealedAt: new Date().toISOString(),
          source: 'api/threats/ingest',
        },
        riskVelocitySignalStatus: 'promoted',
        signalVelocityLifecycle: 'promoted',
        commandCenterLifecycle: 'ACTIVE_RISK',
      } as const;

      if (useRiskForChaos) {
        const rowIngest = await prisma.riskEvent.findFirst({
          where: { id: threatId },
          select: { tenantId: true, ingestionDetails: true },
        });
        if (rowIngest) {
          const parsed = parseIngestionDetailsForMerge(rowIngest.ingestionDetails ?? null) as Record<string, unknown>;
          if (isChaosLikeIngestion(parsed, botIngest)) {
            const mergedChaos = mergeIngestionDetailsPatchJson(rowIngest.ingestionDetails ?? null, {
              ...chaosPatch,
            });
            await prisma.riskEvent.updateMany({
              where: { id: threatId, tenantId: rowIngest.tenantId },
              data: { assigneeId: 'User_00', ingestionDetails: mergedChaos },
            });
          }
        }
      } else {
        const rowIngest = await prisma.threatEvent.findUnique({
          where: { id: threatId },
          select: { ingestionDetails: true },
        });
        const parsed = parseIngestionDetailsForMerge(rowIngest?.ingestionDetails ?? null) as Record<string, unknown>;
        if (isChaosLikeIngestion(parsed, botIngest)) {
          const mergedChaos = mergeIngestionDetailsPatch(rowIngest?.ingestionDetails ?? null, {
            ...chaosPatch,
          });
          await prisma.threatEvent.updateMany({
            where: { id: threatId },
            data: { assigneeId: 'User_00', ingestionDetails: mergedChaos },
          });
        }
      }
    } catch (chaosStampErr) {
      console.warn('[api/threats/ingest] chaos User_00 stamp failed', chaosStampErr);
    }

    if (shadow && tenantId) {
      console.info('[api/threats/ingest] bot-passport OK — tenant scope:', tenantId, 'threatId:', threatId);
    }

    /** Epic 10.5 — live workforce bus (non-blocking on failure; acknowledgement already committed). */
    let orchestrationBus:
      | Awaited<ReturnType<typeof invokeIngestOrchestrationBus>>
      | undefined;
    if (!ingestOrchestrationBusDisabled(body)) {
      const rawData =
        (body.rawData && typeof body.rawData === 'object' && !Array.isArray(body.rawData)
          ? (body.rawData as Record<string, unknown>)
          : null) ??
        (body.raw_payload && typeof body.raw_payload === 'object' && !Array.isArray(body.raw_payload)
          ? (body.raw_payload as Record<string, unknown>)
          : null);

      const parsedIngest = parseIngestionDetailsForMerge(threat.ingestionDetails ?? null) as Record<
        string,
        unknown
      >;

      orchestrationBus = await invokeIngestOrchestrationBus(
        {
          tenantId,
          threatId,
          rawPayload: {
            ...parsedIngest,
            ...(rawData ?? {}),
            operatorId,
            justification,
          },
          threadId: threatId,
        },
        { body },
      );

      if (orchestrationBus.ok) {
        try {
          const busPatch = {
            orchestrationBusCycle: {
              completedAt: new Date().toISOString(),
              currentAgent: orchestrationBus.currentAgent,
              ironquerySignature: orchestrationBus.ironquerySignature,
              logLineCount: orchestrationBus.agentLogs.length,
              status: orchestrationBus.status,
            },
          };
          const useRiskTable = await ingressUsesRiskEventTable();
          if (useRiskTable) {
            const row = await prisma.riskEvent.findFirst({
              where: { id: threatId },
              select: { tenantId: true, ingestionDetails: true },
            });
            if (row?.tenantId) {
              const merged = mergeIngestionDetailsPatchJson(row.ingestionDetails ?? null, busPatch);
              await prisma.riskEvent.updateMany({
                where: { id: threatId, tenantId: row.tenantId },
                data: { ingestionDetails: merged },
              });
            }
          } else {
            const te = await prisma.threatEvent.findUnique({
              where: { id: threatId },
              select: { ingestionDetails: true },
            });
            const merged = mergeIngestionDetailsPatch(te?.ingestionDetails ?? null, busPatch);
            await prisma.threatEvent.updateMany({
              where: { id: threatId },
              data: { ingestionDetails: merged },
            });
          }
        } catch (busStampErr) {
          console.warn('[api/threats/ingest] orchestration bus ingestion stamp failed', busStampErr);
        }
      }
    }

    console.info(
      '[api/threats/ingest] SUCCESS: Row written — tenant:',
      tenantId,
      'threatId:',
      threatId,
    );

    revalidatePath('/');
    revalidatePath('/integrity');

    const headers = new Headers();
    if (shadow && botIngest) {
      headers.set('x-shadow-plane-ingest', '1');
      headers.set('x-shadow-plane-bot-passport', '1');
    }

    headers.set('X-Ironframe-Client-Refresh', '1');

    revalidatePath('/', 'layout');

    return NextResponse.json(
      {
        success: true,
        shadowPlaneIngest: shadow && botIngest,
        ...(orchestrationBus?.ok
          ? {
              orchestrationBus: {
                executionAuditTrail: orchestrationBus.agentLogs,
                assignedQuarantiner: orchestrationBus.currentAgent,
                ironquerySignature: orchestrationBus.ironquerySignature,
                status: orchestrationBus.status,
              },
            }
          : orchestrationBus && !orchestrationBus.ok
            ? { orchestrationBusError: orchestrationBus.error }
            : {}),
      },
      { headers },
    );
  } catch (e) {
    console.error('[api/threats/ingest]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
