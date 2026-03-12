/**
 * Irongate DMZ — strict backend validation for Threat Registration and Analyst Notes.
 * Vitest unit tests for threatIngressSchema (TDD).
 */
import { describe, it, expect } from 'vitest';
import { threatIngressSchema } from '@/app/utils/irongateSchema';

describe('threatIngressSchema — Irongate Validation', () => {
  it('The Golden Path: valid payload (title, source, target, loss as string, notes under 500 chars) passes validation', () => {
    const payload = {
      title: 'Ransomware Indicator',
      source: 'Manual Analyst Entry',
      target: 'Healthcare',
      loss: '500000000',
      notes: 'Context note under 500 characters.',
    };
    const result = threatIngressSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Ransomware Indicator');
      expect(result.data.source).toBe('Manual Analyst Entry');
      expect(result.data.target).toBe('Healthcare');
      expect(result.data.loss).toBe('500000000');
      expect(result.data.notes).toBe('Context note under 500 characters.');
    }
  });

  it('The Golden Path: valid payload without notes passes', () => {
    const payload = {
      title: 'PHI Exposure',
      source: 'SOC',
      target: 'Finance',
      loss: '100000000',
    };
    const result = threatIngressSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeUndefined();
    }
  });

  it('The Bloat Attack: notes string exceeding 500 characters throws validation error', () => {
    const payload = {
      title: 'Valid Title',
      source: 'Manual',
      target: 'Healthcare',
      loss: '500000000',
      notes: 'x'.repeat(501),
    };
    const result = threatIngressSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues.some((i) => i.path.includes('notes') || i.message.toLowerCase().includes('500'))).toBe(true);
    }
  });

  it('The BigInt Integrity Check: loss with decimals (e.g. "500.50") is rejected', () => {
    const payload = {
      title: 'Valid Title',
      source: 'Manual',
      target: 'Healthcare',
      loss: '500.50',
    };
    const result = threatIngressSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('loss'))).toBe(true);
    }
  });

  it('The BigInt Integrity Check: loss with alphabetical characters (e.g. "500M") is rejected', () => {
    const payload = {
      title: 'Valid Title',
      source: 'Manual',
      target: 'Healthcare',
      loss: '500M',
    };
    const result = threatIngressSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('loss'))).toBe(true);
    }
  });

  it('The BigInt Integrity Check: loss must be a string of pure integers (only digits)', () => {
    expect(threatIngressSchema.safeParse({ title: 'T', source: 'S', target: 'T', loss: '0' }).success).toBe(true);
    expect(threatIngressSchema.safeParse({ title: 'T', source: 'S', target: 'T', loss: '123456789' }).success).toBe(true);
    expect(threatIngressSchema.safeParse({ title: 'T', source: 'S', target: 'T', loss: ' 500 ' }).success).toBe(false);
  });

  it('The Empty Payload: missing title is rejected', () => {
    const payload = { source: 'Manual', target: 'Healthcare', loss: '500000000' };
    const result = threatIngressSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('title'))).toBe(true);
    }
  });

  it('The Empty Payload: missing source is rejected', () => {
    const payload = { title: 'Valid Title', target: 'Healthcare', loss: '500000000' };
    const result = threatIngressSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('source'))).toBe(true);
    }
  });

  it('The Empty Payload: missing target is rejected', () => {
    const payload = { title: 'Valid Title', source: 'Manual', loss: '500000000' };
    const result = threatIngressSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('target'))).toBe(true);
    }
  });

  it('The Empty Payload: missing loss is rejected', () => {
    const payload = { title: 'Valid Title', source: 'Manual', target: 'Healthcare' };
    const result = threatIngressSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('loss'))).toBe(true);
    }
  });

  it('title over 100 characters is rejected', () => {
    const payload = {
      title: 'x'.repeat(101),
      source: 'Manual',
      target: 'Healthcare',
      loss: '500000000',
    };
    const result = threatIngressSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('notes is automatically trimmed', () => {
    const payload = {
      title: 'Title',
      source: 'S',
      target: 'T',
      loss: '100',
      notes: '  trimmed  ',
    };
    const result = threatIngressSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe('trimmed');
    }
  });
});
