/**
 * Iteration 1.2: PII/PHI Masking in PDF Exports (Backlog Item 4).
 * Verifies that maskSensitiveData() sanitizes PII before data can leave the system in export payloads.
 */
import { describe, it, expect } from 'vitest';
import { maskSensitiveData } from '@/app/utils/retentionPolicy';

describe('PDF export payload — PII/PHI masking', () => {
  it('replaces SSN (123-45-6789) with [MASKED_SSN] in export payload', () => {
    const input = 'Patient SSN 123-45-6789 for verification.';
    const output = maskSensitiveData(input);
    expect(output).toContain('[MASKED_SSN]');
    expect(output).not.toContain('123-45-6789');
  });

  it('replaces email addresses with [MASKED_EMAIL] in export payload', () => {
    const input = 'Contact blackwoodscoffee@gmail.com for follow-up.';
    const output = maskSensitiveData(input);
    expect(output).toContain('[MASKED_EMAIL]');
    expect(output).not.toMatch(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  });

  it('sanitizes mock report containing SSN and email so exported payload has no raw PII', () => {
    const mockReport =
      'Investigation notes: Patient ID ref 123-45-6789. Escalate to analyst@example.com. Findings: no breach.';
    const payloadForExport = maskSensitiveData(mockReport);
    expect(payloadForExport).toContain('[MASKED_SSN]');
    expect(payloadForExport).toContain('[MASKED_EMAIL]');
    expect(payloadForExport).not.toContain('123-45-6789');
    expect(payloadForExport).not.toContain('analyst@example.com');
  });

  it('leaves non-PII text unchanged', () => {
    const input = 'No sensitive data in this segment.';
    const output = maskSensitiveData(input);
    expect(output).toBe(input);
  });
});
