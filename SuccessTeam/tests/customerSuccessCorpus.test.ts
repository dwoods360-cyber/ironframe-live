import { describe, expect, it } from 'vitest';

import { auditAccountHealth } from '../src/agents/healthAuditor.js';
import { findExpansionMotion } from '../src/agents/expansionFinder.js';
import { quantifyAccountValue } from '../src/agents/valueQuantifier.js';
import {
  CUSTOMER_SUCCESS_CORPUS_MANIFEST,
  CUSTOMER_SUCCESS_KNOWLEDGE_CORPUS,
  resolveRetentionPlayIds,
} from '../src/knowledge/customerSuccessCorpus.js';
import type { AccountRecord } from '../src/lib/accountsPollClient.js';
import type { HealthSnapshot } from '../src/lib/healthSnapshotClient.js';

function mockAccount(overrides: Partial<AccountRecord> = {}): AccountRecord {
  return {
    dealId: 'deal-1',
    contactId: 'contact-1',
    tenantId: 'tenant-1',
    stage: 'CLOSED_WON',
    dealTitle: 'Medshield Annual',
    valueCents: '5000000',
    company: 'Medshield Health',
    fullName: 'Alex Rivera',
    email: 'alex@medshield.example',
    phone: null,
    industrySector: 'HEALTH_HIPAA',
    updatedAt: new Date().toISOString(),
    lastInteractionAt: null,
    daysSinceInteraction: 45,
    ...overrides,
  };
}

function mockSnapshot(overrides: Partial<HealthSnapshot> = {}): HealthSnapshot {
  return {
    dealId: 'deal-1',
    tenantId: 'tenant-1',
    contactId: 'contact-1',
    stage: 'CLOSED_WON',
    valueCents: '5000000',
    industrySector: 'HEALTH_HIPAA',
    healthScore: 55,
    healthBand: 'at_risk',
    signals: ['STALE_ENGAGEMENT', 'LOW_EVIDENCE_COMPLETENESS'],
    pilotMetadata: { lastEvidenceCompletenessPct: 50 },
    lastInteractionAt: null,
    daysSinceInteraction: 45,
    polledAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('customerSuccessCorpus', () => {
  it('ships comprehensive CS knowledge entries', () => {
    expect(CUSTOMER_SUCCESS_CORPUS_MANIFEST.entryCount).toBeGreaterThanOrEqual(20);
    expect(CUSTOMER_SUCCESS_KNOWLEDGE_CORPUS.customer_success).toBeDefined();
    expect(CUSTOMER_SUCCESS_KNOWLEDGE_CORPUS.gainsight_playbook).toBeDefined();
    expect(CUSTOMER_SUCCESS_KNOWLEDGE_CORPUS.medshield_hipaa_cs).toBeDefined();
  });

  it('routes at-risk accounts to retention plays', () => {
    const plays = resolveRetentionPlayIds('at_risk');
    expect(plays).toContain('retention_save_plays');
  });
});

describe('healthAuditor', () => {
  it('flags stale engagement in audit notes', () => {
    const audit = auditAccountHealth(mockAccount(), mockSnapshot());
    expect(audit.healthBand).toBe('at_risk');
    expect(audit.auditNotes.some((n) => n.includes('Engagement'))).toBe(true);
  });
});

describe('expansionFinder', () => {
  it('blocks expansion when health is at_risk', () => {
    const audit = auditAccountHealth(mockAccount(), mockSnapshot());
    const value = quantifyAccountValue(audit);
    const finding = findExpansionMotion(audit, value);
    expect(finding.advisoryType).toBe('RETENTION');
    expect(finding.expansionEligible).toBe(false);
  });

  it('allows expansion when healthy', () => {
    const audit = auditAccountHealth(
      mockAccount(),
      mockSnapshot({ healthScore: 85, healthBand: 'healthy', signals: [] }),
    );
    const value = quantifyAccountValue(audit);
    const finding = findExpansionMotion(audit, value);
    expect(finding.advisoryType).toBe('EXPANSION');
    expect(finding.expansionEligible).toBe(true);
  });
});
