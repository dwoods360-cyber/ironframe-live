import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ThreatState } from '@prisma/client';
import { threatIngressSchema } from '@/app/utils/irongateSchema';
import { ZodError } from 'zod';

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

export type CreateThreatBody = {
  title: string;
  source?: string;
  target?: string;
  loss: string;
  description?: string;
  notes?: string;
};

/**
 * POST /api/threats — create a threat event and return the full record with DB id.
 * Used by manual risk registration so the pipeline never gets phantom ids.
 * Constitutional: requires x-tenant-id header (tenant UUID); returns 401 if missing.
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id')?.trim() || null;
    if (!tenantId) {
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

    const created = await prisma.threatEvent.create({
      data: {
        title,
        sourceAgent: source || 'Manual Analyst Entry',
        score,
        targetEntity: target || 'Healthcare',
        financialRisk_cents,
        status: ThreatState.PIPELINE,
        ttlSeconds: DEFAULT_TTL_SECONDS,
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
    const descriptionText = description
      ? `Source: ${created.sourceAgent} · ${description}`
      : `Source: ${created.sourceAgent}`;

    return NextResponse.json({
      id: created.id,
      name: created.title,
      loss: lossM,
      score: created.score,
      industry: created.targetEntity,
      target: created.targetEntity,
      source: created.sourceAgent,
      description: descriptionText,
      tenantId,
    });
  } catch (e) {
    console.error('[api/threats POST]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
