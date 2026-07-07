import { createHash } from 'node:crypto';

import type { AllowlistedSource } from '../config/allowlistedSources.js';
import { ALLOWLISTED_OSINT_SOURCES, assertUrlOnAllowlist } from '../config/allowlistedSources.js';
import { hashContent, loadIronleadsEnv } from '../loadIronleadsEnv.js';
import { getIronleadsPrisma } from '../lib/prisma.js';
import { truncateText } from '../lib/sanitizer.js';

loadIronleadsEnv();

const FIXTURE_PAYLOADS: Record<string, string> = {
  'fixture://regional-bhc-sample': [
    'FFIEC enforcement notice: Western Alliance Bancorporation subsidiary cited for',
    'deficiencies in enterprise risk management and board cyber reporting.',
    'Chief Information Security Officer role posted — cyber risk quantification required.',
  ].join(' '),
  'fixture://mssp-sample': [
    'Pivot Point Security expands vCISO practice — hiring GRC analysts for',
    'multi-client command post delivery and HIPAA-aligned client enclaves.',
  ].join(' '),
};

async function fetchAllowlistedText(source: AllowlistedSource): Promise<string> {
  assertUrlOnAllowlist(source.url);

  if (source.url.startsWith('fixture://')) {
    return FIXTURE_PAYLOADS[source.url] ?? '';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Ironleads-LeadScout/1.0 (+https://ironframegrc.com)',
        Accept: 'application/json, text/html, text/plain, */*',
      },
    });
    if (!response.ok) {
      throw new Error(`Fetch failed ${response.status} for ${source.id}`);
    }
    const text = await response.text();
    return truncateText(text, 500_000);
  } finally {
    clearTimeout(timeout);
  }
}

export type LeadScoutResult = {
  sourceId: string;
  fetched: boolean;
  stored: boolean;
  signalId?: string;
  reason?: string;
};

/** Agent L-01 — cron-bound fetch into SQLite scratchpad only. */
export async function runLeadScout(sourceIds?: string[]): Promise<LeadScoutResult[]> {
  const prisma = getIronleadsPrisma();
  const targets = sourceIds?.length
    ? ALLOWLISTED_OSINT_SOURCES.filter(source => sourceIds.includes(source.id))
    : ALLOWLISTED_OSINT_SOURCES;

  const results: LeadScoutResult[] = [];

  for (const source of targets) {
    try {
      const rawTextPayload = await fetchAllowlistedText(source);
      if (!rawTextPayload || rawTextPayload.length < 40) {
        results.push({
          sourceId: source.id,
          fetched: true,
          stored: false,
          reason: 'Payload too short — skipped',
        });
        continue;
      }

      const contentHash = hashContent(`${source.id}|${rawTextPayload.slice(0, 8000)}`);
      const existing = await prisma.rawScrapedSignal.findUnique({ where: { contentHash } });
      if (existing) {
        results.push({
          sourceId: source.id,
          fetched: true,
          stored: false,
          signalId: existing.id,
          reason: 'Duplicate content hash',
        });
        continue;
      }

      const row = await prisma.rawScrapedSignal.create({
        data: {
          sourceId: source.id,
          targetUrl: source.url,
          rawTextPayload,
          contentHash,
        },
      });

      results.push({
        sourceId: source.id,
        fetched: true,
        stored: true,
        signalId: row.id,
      });
    } catch (err) {
      results.push({
        sourceId: source.id,
        fetched: false,
        stored: false,
        reason: err instanceof Error ? err.message : 'LeadScout fetch failed',
      });
    }
  }

  return results;
}

export function fingerprintSignal(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}
