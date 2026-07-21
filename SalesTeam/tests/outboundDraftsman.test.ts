import { describe, expect, it } from 'vitest';

import {
  DESIGN_PARTNER_PATH_B_USD,
  draftOutboundMessage,
  humanizeDetectedTrigger,
  validateOutboundContentQuality,
} from '../src/agents/outboundDraftsman.js';
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
  it('opens problem-led then sells paid Path B with workflow-review CTA', () => {
    const draft = draftOutboundMessage(SAMPLE_PROSPECT, 'EMAIL');
    expect(draft.storyBrandOk).toBe(true);
    expect(draft.contentQualityOk).toBe(true);
    expect(draft.body.toLowerCase()).toContain('decision-maker');
    expect(draft.body.toLowerCase()).toContain('quick question');
    expect(draft.body).toContain('$5900000.00');
    expect(draft.body).toContain(`$${DESIGN_PARTNER_PATH_B_USD}`);
    expect(draft.body.toLowerCase()).toContain('workflow review');
    expect(draft.body.toLowerCase()).not.toContain('in this story, not us');
    expect(draft.body.toLowerCase()).not.toContain('wedge:');
    expect(draft.body.toLowerCase()).not.toContain('pending operator approval');
    expect(draft.body).toMatch(/\n\n/);
    expect(draft.subject.toLowerCase()).toContain('workflow');
    expect(draft.industrySector).toBe('REGIONAL_BHC');
  });

  it('humanizes CRM triggers and never leaks product-fact operator instructions', () => {
    expect(humanizeDetectedTrigger('COMPLIANCE_JOB_POST')).toContain('hiring');
    const draft = draftOutboundMessage(
      { ...SAMPLE_PROSPECT, detectedTrigger: 'COMPLIANCE_JOB_POST', valueCents: '0' },
      'EMAIL',
    );
    expect(draft.body).not.toContain('COMPLIANCE_JOB_POST');
    expect(draft.body.toLowerCase()).toContain('hiring');
    expect(draft.body.toLowerCase()).not.toContain('anti-hallucination');
    expect(draft.body.toLowerCase()).not.toContain('never invent portals');
    expect(draft.body.toLowerCase()).not.toContain('governance frame');
    expect(draft.body).not.toMatch(/\$0\.00/);
    expect(draft.contentQualityOk).toBe(true);
  });

  it('keeps SMS drafts short and commercial', () => {
    const draft = draftOutboundMessage(SAMPLE_PROSPECT, 'SMS');
    expect(draft.channel).toBe('SMS');
    expect(draft.body).toContain(`$${DESIGN_PARTNER_PATH_B_USD}`);
    expect(draft.body.length).toBeLessThan(320);
  });

  it('fails content quality when prompt artifacts remain', () => {
    const leaked =
      'Hi — COMPLIANCE_JOB_POST. Anti-hallucination: never invent portals. — Ironframe Governance Frame';
    const result = validateOutboundContentQuality(leaked);
    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('resolves all Core 4 beachhead prompts', () => {
    for (const sector of ['REGIONAL_BHC', 'UTILITY_NERC', 'MSSP_ENCLAVE', 'HEALTH_HIPAA'] as const) {
      expect(resolveBeachheadPrompt(sector).sector).toBe(sector);
    }
  });
});
