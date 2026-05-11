import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { ThreatState } from '@prisma/client';
import { threatIngressSchema } from '@/app/utils/irongateSchema';
import { mergeIngestionDetailsPatch } from '@/app/utils/ingestionDetailsMerge';
import { ZodError } from 'zod';
import { assertSimulationInjectAllowedForTenant } from '@/app/lib/simulationStandDown';
import { getActiveTenantUuidFromCookies, isValidTenantUuid } from '@/app/utils/serverTenantContext';
import { isShadowPlaneActiveFromEnv } from '@/app/utils/shadowPlaneActive';

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

    const body = (await request.json().catch(() => ({}))) as CreateThreatBody;

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

    const ingestionDetailsForCreate = applyTopSectorIngestion
      ? mergeIngestionDetailsPatch(null, { grcJustification: TOP_SECTOR_DEFAULT_GRC_JUSTIFICATION })
      : undefined;

    const descriptionText = description
      ? `Source: ${source} · ${description}`
      : `Source: ${source}`;

    const created = await prisma.threatEvent.create({
      data: {
        title,
        sourceAgent: source || 'Manual Analyst Entry',
        score,
        targetEntity: target || 'Healthcare',
        financialRisk_cents,
        status,
        ttlSeconds: DEFAULT_TTL_SECONDS,
        tenantCompanyId: company?.id,
        aiReport: descriptionText,
        ...(ingestionDetailsForCreate != null ? { ingestionDetails: ingestionDetailsForCreate } : {}),
      },
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
    }, { headers });
  } catch (e) {
    console.error('[api/threats POST]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
