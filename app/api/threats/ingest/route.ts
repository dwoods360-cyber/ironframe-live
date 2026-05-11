import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { acknowledgeThreatAction } from '@/app/actions/threatActions';
import { grcGatePass } from '@/app/utils/grcGate';
import { getActiveTenantUuidFromCookies, isValidTenantUuid } from '@/app/utils/serverTenantContext';
import { isShadowPlaneActiveFromEnv } from '@/app/utils/shadowPlaneActive';
import { TENANT_UUIDS } from '@/app/utils/tenantIsolation';

/** Canonical Medshield tenant UUID — aligns bot writes with default dev session / terminal logs when env shadow has no cookie. */
const SHADOW_PLANE_DEFAULT_TENANT_UUID = TENANT_UUIDS.medshield;

function shadowPlaneActive(request: NextRequest): boolean {
  if (isShadowPlaneActiveFromEnv()) return true;
  return request.cookies.get('ironframe-simulation-mode')?.value === '1';
}

/** Same-origin bots / CLI — prefer header over body so writes align with `GET /api/dashboard` Ironguard scope. */
function tenantUuidFromHeader(request: NextRequest): string | null {
  const raw = request.headers.get('x-tenant-id')?.trim();
  return raw && isValidTenantUuid(raw) ? raw : null;
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
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
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

    const threat = await prisma.threatEvent.findUnique({
      where: { id: threatId },
      select: { financialRisk_cents: true },
    });

    if (!threat) {
      return NextResponse.json(
        { error: 'Threat not found.' },
        { status: 404 }
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

    const result = await acknowledgeThreatAction(threatId, tenantId, operatorId, justification);

    if (result && typeof result === 'object' && 'success' in result && result.success === false) {
      return NextResponse.json(
        { error: (result as { error?: string }).error ?? 'Acknowledge failed.' },
        { status: 400 }
      );
    }

    if (shadow && tenantId) {
      console.info('[api/threats/ingest] bot-passport OK — tenant scope:', tenantId, 'threatId:', threatId);
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

    return NextResponse.json({ success: true, shadowPlaneIngest: shadow && botIngest }, { headers });
  } catch (e) {
    console.error('[api/threats/ingest]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
