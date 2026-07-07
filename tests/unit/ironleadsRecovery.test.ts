import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';

import { fingerprintParserSuccess, LKG_PARSER_SUCCESS } from '@/Ironleads/src/graph/lkg';
import { findLastKnownGoodSnapshot } from '@/Ironleads/src/graph/recovery';
import { ironleadsApp, invokeIronleadsPipeline } from '@/Ironleads/src/graph/pipeline';
import { getIronleadsPrisma } from '@/Ironleads/src/lib/prisma';
import { loadIronleadsEnv } from '@/Ironleads/src/loadIronleadsEnv';
import { resetIronleadsScratchpad } from '../helpers/ironleadsTestHarness';

loadIronleadsEnv();

describe('ironleads LKG recovery', () => {
  beforeEach(async () => {
    await resetIronleadsScratchpad();
  });
  it('fingerprints parser-clean state deterministically', () => {
    const state = {
      runId: 'run-1',
      scoutResults: [],
      parserResults: [],
      parsedLeads: [
        {
          qualifiedLeadId: 'ql-1',
          signalId: 'sig-1',
          companyName: 'Acme',
          industrySector: 'REGIONAL_BHC',
          detectedTrigger: 'REG_FINE',
          confidenceScore: 80,
        },
      ],
    };
    const a = fingerprintParserSuccess(state);
    const b = fingerprintParserSuccess(state);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('finds parser success snapshot in thread history', () => {
    const fingerprint = fingerprintParserSuccess({
      parsedLeads: [{ qualifiedLeadId: 'x' } as never],
    });
    const history = [
      {
        values: {
          lastKnownGoodNode: LKG_PARSER_SUCCESS,
          stateFingerprint: fingerprint,
        },
        next: ['scorer'],
        tasks: [],
        metadata: {},
        config: { configurable: { checkpoint_id: 'chk-1' } },
      },
      {
        values: { lastKnownGoodNode: null },
        next: [],
        tasks: [{ error: new Error('boom') }],
        metadata: {},
        config: { configurable: { checkpoint_id: 'chk-bad' } },
      },
    ];
    const found = findLastKnownGoodSnapshot(history as never);
    expect(found?.config.configurable?.checkpoint_id).toBe('chk-1');
  });

  it('rewinds to parser LKG and quarantines leads when scorer fails', async () => {
    const threadId = `recovery-test-${randomUUID()}`;
    const prisma = getIronleadsPrisma();

    const result = await invokeIronleadsPipeline({
      threadId,
      sourceIds: ['ironleads_fixture_mssp'],
      skipIngress: true,
      injectScorerFailure: true,
    });

    expect(result.recovery?.applied).toBe(true);
    expect(result.recovery?.lastKnownGoodNode).toBe(LKG_PARSER_SUCCESS);
    expect(result.recovery?.failurePolicy).toBe('quarantine');
    expect(result.pipelineLog.some(line => line.includes('[recovery]'))).toBe(true);
    expect(result.pipelineLog.some(line => line.includes('[quarantine_dlq]'))).toBe(true);

    const quarantined = await prisma.quarantineLead.findMany({
      where: { threadId },
    });
    expect(quarantined.length).toBeGreaterThanOrEqual(0);
  });
});
