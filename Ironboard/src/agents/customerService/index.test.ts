import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLogInteraction = vi.fn();
const mockGenerateContent = vi.fn();
const mockFindManyAppDocument = vi.fn();
const mockFindManyInteraction = vi.fn();

vi.mock('../../services/crm/crmService.js', () => ({
  logInteraction: (...args: unknown[]) => mockLogInteraction(...args),
}));

vi.mock('../../services/prisma.js', () => ({
  getPrisma: () => ({
    appDocument: { findMany: mockFindManyAppDocument },
    ironboardCrmInteraction: { findMany: mockFindManyInteraction },
  }),
}));

vi.mock('../../loadIronboardEnv.js', () => ({
  loadIronboardEnv: vi.fn(),
  getIronboardApiKey: vi.fn(() => 'test-key'),
  getIronboardGeminiModel: vi.fn(() => 'gemini-3.5-flash'),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

import { runCustomerServiceAgent } from './index.js';

const sampleMessage = {
  emailId: 'email-1',
  messageId: 'msg-1',
  from: 'customer@example.com',
  to: ['support@ironboard.com'],
  subject: 'How do I reset MFA?',
  textBody: 'I cannot log in after device change.',
  channel: 'INBOUND' as const,
  timestamp: new Date('2026-06-17T12:00:00.000Z'),
};

describe('runCustomerServiceAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindManyAppDocument.mockResolvedValue([
      {
        title: 'Quickstart',
        slug: 'readme',
        content: 'Reset MFA via Settings > Security.',
      },
    ]);
    mockFindManyInteraction.mockResolvedValue([]);
    mockGenerateContent.mockResolvedValue({ text: 'Visit Settings > Security to reset MFA.' });
    mockLogInteraction.mockResolvedValue({ id: 'interaction-1' });
  });

  it('logs a pending draft after Gemini synthesis', async () => {
    await runCustomerServiceAgent('tenant-uuid', 'contact-uuid', sampleMessage);

    expect(mockGenerateContent).toHaveBeenCalledOnce();
    expect(mockLogInteraction).toHaveBeenCalledOnce();
    const [, input] = mockLogInteraction.mock.calls[0] as [string, { summary: string }];
    expect(input.summary).toContain('[PENDING DRAFT APPROVAL]');
    expect(input.summary).toContain('Settings > Security');
  });

  it('uses deterministic generation parameters', async () => {
    await runCustomerServiceAgent('tenant-uuid', 'contact-uuid', sampleMessage);

    const call = mockGenerateContent.mock.calls[0]?.[0] as {
      config?: { temperature?: number; topP?: number };
    };
    expect(call.config?.temperature).toBe(0);
    expect(call.config?.topP).toBe(0);
  });
});
