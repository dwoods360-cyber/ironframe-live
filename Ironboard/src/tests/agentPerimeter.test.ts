import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLogInteraction = vi.fn();
const mockFindManyAppDocument = vi.fn();
const mockFindManyInteraction = vi.fn();
const mockGenerateContent = vi.fn();

vi.mock('../services/prisma.js', () => ({
  getPrisma: () => ({
    appDocument: {
      findMany: mockFindManyAppDocument,
    },
    ironboardCrmInteraction: {
      findMany: mockFindManyInteraction,
    },
    ironboardCrmContact: {
      findMany: vi.fn(),
    },
  }),
}));

vi.mock('../services/crm/crmService.js', () => ({
  logInteraction: (...args: unknown[]) => mockLogInteraction(...args),
}));

vi.mock('../loadIronboardEnv.js', () => ({
  loadIronboardEnv: vi.fn(),
  getIronboardApiKey: vi.fn(() => 'mock_ironboard_worker_key'),
  getIronboardGeminiModel: vi.fn(() => 'gemini-3.5-flash'),
}));

vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
    };
  }
  return {
    GoogleGenAI: MockGoogleGenAI,
  };
});

import { runCustomerServiceAgent } from '../agents/customerService/index.js';

describe('🤖 Ironboard Customer Service Background Worker Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogInteraction.mockResolvedValue({ id: 'log_mock_123' });
    mockGenerateContent.mockResolvedValue({
      text: 'Deterministic automated support response text.',
    });
    mockFindManyInteraction.mockResolvedValue([]);
  });

  it('should process inbound email context and log an approval-pending draft interaction', async () => {
    mockFindManyAppDocument.mockResolvedValue([
      { title: 'L1 Network Spec', slug: 'l1-network', content: 'Data is isolated securely.' },
    ]);

    const mockEmailPayload = {
      emailId: 'resend_id_abc',
      messageId: 'internet_msg_id_123',
      from: 'client@enterprise.internal',
      to: ['support@ironboard.com'],
      subject: 'Network Connection Error',
      textBody: 'Encountering a configuration boundary timeout.',
      channel: 'INBOUND' as const,
      timestamp: new Date(),
    };

    await runCustomerServiceAgent('tenant_abc_777', 'contact_xyz_888', mockEmailPayload);

    expect(mockFindManyAppDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { readingLevel: 'LEVEL_1' },
      }),
    );

    expect(mockLogInteraction).toHaveBeenCalledWith(
      'tenant_abc_777',
      expect.objectContaining({
        contactId: 'contact_xyz_888',
        channel: 'EMAIL',
        summary: expect.stringContaining('[PENDING DRAFT APPROVAL]'),
      }),
    );
  });

  it('should catch internal generation failures gracefully without throwing unhandled exceptions', async () => {
    mockFindManyAppDocument.mockRejectedValue(new Error('Database connection pool saturated.'));
    mockGenerateContent.mockRejectedValue(new Error('Provider synthesis timeout.'));

    const mockEmailPayload = {
      emailId: 'resend_id_fail',
      messageId: 'internet_msg_id_fail',
      from: 'client@enterprise.internal',
      to: ['support@ironboard.com'],
      subject: 'Urgent Outage',
      textBody: 'System trace required.',
      channel: 'INBOUND' as const,
      timestamp: new Date(),
    };

    await expect(
      runCustomerServiceAgent('tenant_abc_777', 'contact_xyz_888', mockEmailPayload),
    ).resolves.not.toThrow();

    expect(mockLogInteraction).not.toHaveBeenCalled();
  });
});
