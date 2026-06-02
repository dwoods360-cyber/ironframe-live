import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { ThreatState } from '@prisma/client';
import { threatIngressSchema } from '@/app/utils/irongateSchema';
import { mergeIngestionDetailsPatch } from '@/app/utils/ingestionDetailsMerge';
import { markOperationalDeficiencyReportPromotedToThreat } from '@/app/lib/opsupport/markDeficiencyPromoted';
import { ZodError } from 'zod';
import { assertSimulationInjectAllowedForTenant } from '@/app/lib/simulationStandDown';
import { getActiveTenantUuidFromCookies, isValidTenantUuid } from '@/app/utils/serverTenantContext';
import { isShadowPlaneActiveFromEnv } from '@/app/utils/shadowPlaneActive';
import {
  ingressSanitizerFailureResponse,
  sanitizeIngressPayload,
} from '@/app/lib/ironethic/ingressSanitizer';
import { sanitizeThreatIngressPayload } from '@/app/lib/ironethic/sanitizeThreatIngressPayload';
import {
  ingestOrchestrationBusDisabled,
  invokeIngestOrchestrationBus,
} from '@/src/services/orchestration/ingestBusBridge';

/** Align bot/header UUID with Command Center cookie under shadow plane (RLS + dashboard scope). */
function shadowPlaneActive(request: NextRequest): boolean {
  if (isShadowPlaneActiveFromEnv()) return true;
  return request.cookies.get('ironframe-simulation-mode')?.value === '1';
}

function tenantUuidFromHeader(request: NextRequest): string | null {
  const raw = request.headers.get('x-tenant-id')?.trim();
  return raw && isValidTenantUuid(raw) ? raw : null;
}

const DEFAULT_TTL_SECONDS = 259200; // 72 hours
const CENTS_PER_MILLION = 100_000_000;

/** Parse loss: string (cents, pure digits) → BigInt cents. DMZ guarantees ^\d+$ via threatIngressSchema. */
function parseLossToCents(loss: string): bigint {
  const trimmed = (loss ?? '').trim();
  if (!trimmed) return BigInt(0);
  return BigInt(trimmed);
}

function centsToMillions(value: bigint): number {
  return Number(value) / CENTS_PER_MILLION;
}

/** Sources allowed to persist default `grcJustification` (Strategic Intel “Top Sector Threats” registration only). */
const TOP_SECTOR_REGISTRATION_SOURCES = new Set(['Top Sector Threats', 'Strategic Intel Profile']);
const TOP_SECTOR_DEFAULT_GRC_JUSTIFICATION = 'Top Sector Threat';

export type CreateThreatBody = {
  title: string;
  source?: string;
  target?: string;
  loss: string;
  description?: string;
  notes?: string;
  destination?: 'pipeline' | 'active';
  /** When source is a Top Sector path and value is exactly this string, merged into `ingestionDetails` JSON. */
  grcJustification?: string;
  /** Risk Velocity / raw signal id — stamped into ingestion when the signal becomes a DB-backed threat. */
  sourceSignalId?: string;
  /** Shadow deficiency queue `payload.reportId` — marks the diagnostic row promoted so the queue drops it. */
  deficiencyReportId?: string;
};

/**
 * POST /api/threats — create a threat event and return the full record with DB id.
 * Used by manual risk registration so the pipeline never gets phantom ids.
 * Tenant scope: `x-tenant-id` header, except shadow plane (`SHADOW_PLANE_ACTIVE` / simulation cookie) — then `ironframe-tenant` cookie wins so bots align with the dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    const headerTenant = tenantUuidFromHeader(request);
    let tenantId = headerTenant;
    if (shadowPlaneActive(request)) {
      tenantId = headerTenant ?? (await getActiveTenantUuidFromCookies());
    } else if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required. Send x-tenant-id header (tenant UUID).' },
        { status: 401 }
      );
    }

    let body: CreateThreatBody;
    try {
      body = sanitizeIngressPayload(
        (await request.json().catch(() => ({}))) as CreateThreatBody,
      );
    } catch (err) {
      const pepperFailure = ingressSanitizerFailureResponse(err);
      if (pepperFailure) {
        return NextResponse.json(pepperFailure.body, { status: pepperFailure.status });
      }
      throw err;
    }

    let validated: { title: string; source: string; target: string; loss: string; notes?: string };
    try {
      validated = threatIngressSchema.parse({
        title: body.title ?? '',
        source: body.source ?? '',
        target: body.target ?? '',
        loss: typeof body.loss === 'string' ? body.loss : String(body.loss ?? ''),
        notes: body.notes ?? body.description,
      });
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed.',
            details: err.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
          },
          { status: 400 }
        );
      }
      throw err;
    }

    const title = validated.title;
    const source = validated.source || 'Manual Analyst Entry';
    const target = validated.target || 'Healthcare';
    const lossRaw = validated.loss;
    const description = validated.notes ?? '';

    const financialRisk_cents = parseLossToCents(lossRaw);
    const score = 8; // default 1–10 for manual entry

    try {
      await assertSimulationInjectAllowedForTenant(tenantId);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('SIMULATION_STAND_DOWN')) {
        return NextResponse.json({ error: err.message }, { status: 423 });
      }
      throw err;
    }

    const company = await prisma.company.findFirst({
      where: { tenantId: tenantId },
      select: { id: true },
    });

    const destination = (body.destination ?? 'pipeline').toLowerCase();
    const status = destination === 'active' ? ThreatState.CONFIRMED : ThreatState.IDENTIFIED;

    const requestedGrc = typeof body.grcJustification === 'string' ? body.grcJustification.trim() : '';
    const applyTopSectorIngestion =
      requestedGrc === TOP_SECTOR_DEFAULT_GRC_JUSTIFICATION &&
      TOP_SECTOR_REGISTRATION_SOURCES.has(source.trim());

    const sourceSignalId =
      typeof body.sourceSignalId === 'string' ? body.sourceSignalId.trim() : '';
    const deficiencyReportId =
      typeof body.deficiencyReportId === 'string' ? body.deficiencyReportId.trim() : '';

    let ingestionDetailsForCreate: string | undefined = applyTopSectorIngestion
      ? mergeIngestionDetailsPatch(null, { grcJustification: TOP_SECTOR_DEFAULT_GRC_JUSTIFICATION })
      : undefined;
    if (sourceSignalId || deficiencyReportId) {
      ingestionDetailsForCreate = mergeIngestionDetailsPatch(ingestionDetailsForCreate ?? null, {
        ...(sourceSignalId
          ? { promotedFromSignalId: sourceSignalId, signalIngestionLifecycle: 'PROMOTED_TO_ACTIVE_RISK' }
          : {}),
        ...(deficiencyReportId
          ? {
              promotedFromDeficiencyReportId: deficiencyReportId,
              deficiencyPromotionLifecycle: 'INGESTED',
            }
          : {}),
      });
    }

    const manualIngestSealedAt = new Date().toISOString();
    ingestionDetailsForCreate = mergeIngestionDetailsPatch(ingestionDetailsForCreate ?? null, {
      assigned_to: 'User_00',
      owner_id: 'User_00',
      constitutionalAuthority: 'User_00',
      constitutionalAuthorityMeta: {
        role: 'CONSTITUTIONAL_AUTHORITY',
        sealedAt: manualIngestSealedAt,
        primaryAgentSource: source,
      },
    });

    const descriptionText = description
      ? `Source: ${source} · ${description}`
      : `Source: ${source}`;

    const created = await prisma.threatEvent.create({
      data: sanitizeThreatIngressPayload({
        title,
        sourceAgent: source || 'Manual Analyst Entry',
        score,
        targetEntity: target || 'Healthcare',
        financialRisk_cents,
        status,
        ttlSeconds: DEFAULT_TTL_SECONDS,
        tenantCompanyId: company?.id,
        assigneeId: 'User_00',
        aiReport: descriptionText,
        ...(ingestionDetailsForCreate != null ? { ingestionDetails: ingestionDetailsForCreate } : {}),
      }),
      select: {
        id: true,
        title: true,
        sourceAgent: true,
        score: true,
        targetEntity: true,
        financialRisk_cents: true,
        status: true,
      },
    });

    if (deficiencyReportId) {
      try {
        await markOperationalDeficiencyReportPromotedToThreat(tenantId, deficiencyReportId, created.id);
      } catch (e) {
        console.warn('[api/threats POST] deficiency promotion stamp failed', e);
      }
    }

    /** Epic 10 — secondary threat ingress: workforce bus after manual create (non-blocking on failure). */
    let orchestrationBus:
      | Awaited<ReturnType<typeof invokeIngestOrchestrationBus>>
      | undefined;
    const busBody = body as Record<string, unknown>;
    if (tenantId && !ingestOrchestrationBusDisabled(busBody)) {
      orchestrationBus = await invokeIngestOrchestrationBus(
        {
          tenantId,
          threatId: created.id,
          rawPayload: {
            type: 'DOCUMENT_ANALYSIS',
            text: descriptionText,
            source,
            title,
            target,
            telemetryType: 'MANUAL_ANALYST_ENTRY',
            healthBarPercent: 100,
          },
          threadId: created.id,
        },
        { body: busBody },
      );
    }

    const lossM = centsToMillions(created.financialRisk_cents);

    revalidatePath('/');
    revalidatePath('/integrity');

    const headers = new Headers();
    headers.set('X-Ironframe-Client-Refresh', '1');

    return NextResponse.json({
      id: created.id,
      name: created.title,
      loss: lossM,
      score: created.score,
      industry: created.targetEntity,
      target: created.targetEntity,
      source: created.sourceAgent,
      description: descriptionText,
      aiReport: descriptionText,
      /** GRC triage justification (manual registration notes) — shown on Active Risks board. */
      justification: description.trim() || undefined,
      ...(ingestionDetailsForCreate != null ? { ingestionDetails: ingestionDetailsForCreate } : {}),
      tenantId,
      assignedTo: 'unassigned',
      lifecycleState: created.status === ThreatState.CONFIRMED ? 'active' : 'pipeline',
      createdAt: new Date().toISOString(),
      ...(orchestrationBus?.ok
        ? {
            orchestrationBus: {
              lane: orchestrationBus.lane,
              status: orchestrationBus.status,
              routingTarget: orchestrationBus.routingTarget,
            },
          }
        : orchestrationBus && !orchestrationBus.ok
          ? { orchestrationBusError: orchestrationBus.error }
          : {}),
    }, { headers });
  } catch (e) {
    console.error('[api/threats POST]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
