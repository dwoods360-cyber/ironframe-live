import { describe, expect, it } from 'vitest';

import { draftOutboundMessage } from '../src/agents/outboundDraftsman.js';
import { resolveBeachheadPrompt } from '../src/config/beachheadPrompts.js';
import type { ProspectRecord } from '../src/lib/crmPollClient.js';

const SAMPLE_PROSPECT: ProspectRecord = {
  dealId: '11111111-1111-4111-8111-111111111111',
  contactId: '22222222-2222-4222-8222-222222222222',
  tenantId: '33333333-3333-4333-8333-333333333333',
  stage: 'PROSPECT',
  dealTitle: 'Acme Regional Bank',
  valueCents: '590000000',
  company: 'Acme Regional Bank',
  fullName: 'Jordan Lee',
  email: 'jordan@acmebank.example',
  phone: '+12165550100',
  industrySector: 'REGIONAL_BHC',
  detectedTrigger: 'REG_FINE',
  priorityScore: 82,
  updatedAt: new Date().toISOString(),
};

describe('outboundDraftsman', () => {
  it('positions operator as hero and uses BigInt cents narrative', () => {
    const draft = draftOutboundMessage(SAMPLE_PROSPECT, 'EMAIL');
    expect(draft.storyBrandOk).toBe(true);
    expect(draft.body.toLowerCase()).toContain('you the hero');
    expect(draft.body).toContain('$5900000.00');
    expect(draft.industrySector).toBe('REGIONAL_BHC');
  });

  it('resolves all Core 4 beachhead prompts', () => {
    for (const sector of ['REGIONAL_BHC', 'UTILITY_NERC', 'MSSP_ENCLAVE', 'HEALTH_HIPAA'] as const) {
      expect(resolveBeachheadPrompt(sector).sector).toBe(sector);
    }
  });
});
