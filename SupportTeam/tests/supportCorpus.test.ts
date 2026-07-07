import { describe, expect, it } from 'vitest';

import {
  resolveSupportPlayIds,
  urgencyToSeverityTier,
  SUPPORT_KNOWLEDGE_CORPUS,
} from '../src/knowledge/supportCorpus.js';

describe('support knowledge corpus', () => {
  it('registers tiered support plays', () => {
    expect(Object.keys(SUPPORT_KNOWLEDGE_CORPUS).length).toBeGreaterThanOrEqual(4);
    expect(SUPPORT_KNOWLEDGE_CORPUS['tenant-access-403']?.tier).toBe('T1_CRITICAL');
  });

  it('maps urgency to severity tiers', () => {
    expect(urgencyToSeverityTier('DATA_INTEGRITY')).toBe('T1_CRITICAL');
    expect(urgencyToSeverityTier('AUDIT_BLOCKER')).toBe('T2_ELEVATED');
    expect(urgencyToSeverityTier('ROUTINE')).toBe('T3_ROUTINE');
  });

  it('resolves play ids from ticket text', () => {
    const ids = resolveSupportPlayIds({
      urgency: 'DATA_INTEGRITY',
      objective: 'TENANT_ACCESS',
      userNotes: 'Getting 403 on tenant subdomain',
    });
    expect(ids).toContain('tenant-access-403');
  });
});
