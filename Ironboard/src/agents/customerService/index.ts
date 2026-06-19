import { GoogleGenAI } from '@google/genai';

import { DETERMINISTIC_GENERATION_PARAMS } from '../../config/deterministicModel.js';
import { getIronboardApiKey, getIronboardGeminiModel, loadIronboardEnv } from '../../loadIronboardEnv.js';
import { logInteraction } from '../../services/crm/crmService.js';
import { getPrisma } from '../../services/prisma.js';
import type { NormalizedEmailMessage } from '../../types/email.js';

loadIronboardEnv();

const MAX_DOC_CONTENT_CHARS = 6_000;
const MAX_KNOWLEDGE_DOCS = 12;
const MAX_HISTORY_ROWS = 3;
const MAX_PROMPT_BODY_CHARS = 8_000;
const MAX_DRAFT_SUMMARY_CHARS = 12_000;

function sanitizePromptSegment(raw: string, maxLen: number): string {
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/\bon\w+\s*=/gi, 'data-blocked=')
    .slice(0, maxLen);
}

async function loadLevelOneKnowledgeContext(): Promise<string> {
  const systemDocs = await getPrisma()
    .appDocument.findMany({
      where: { readingLevel: 'LEVEL_1' },
      orderBy: { updatedAt: 'desc' },
      take: MAX_KNOWLEDGE_DOCS,
      select: { title: true, slug: true, content: true },
    })
    .catch(() => []);

  if (systemDocs.length === 0) {
    return 'No Level 1 system documentation is populated in the current database cluster.';
  }

  return systemDocs
    .map(doc => {
      const content = sanitizePromptSegment(doc.content, MAX_DOC_CONTENT_CHARS);
      return `Doc Title: ${doc.title}\nPath: /docs/${doc.slug}\nContent:\n${content}`;
    })
    .join('\n\n---\n\n');
}

async function loadContactHistoryContext(tenantId: string, contactId: string): Promise<string> {
  const historicalLogs = await getPrisma()
    .ironboardCrmInteraction.findMany({
      where: { tenantId, contactId },
      orderBy: { occurredAt: 'desc' },
      take: MAX_HISTORY_ROWS,
      select: { occurredAt: true, summary: true },
    })
    .catch(() => []);

  if (historicalLogs.length === 0) {
    return 'No prior contact history logs tracked.';
  }

  return historicalLogs
    .map(log => `[${log.occurredAt.toISOString()}] ${sanitizePromptSegment(log.summary, 1_500)}`)
    .join('\n');
}

const CUSTOMER_SERVICE_SYSTEM_INSTRUCTION = `You are the automated Customer Service Agent for the Ironframe/Ironboard GRC platform.
Draft clear, concise, technically precise support responses using ONLY the validated Knowledge Base context provided.

CRITICAL CONSTRAINTS:
- Keep recommendations non-prescriptive and grounded in the System Documents.
- If the issue cannot be resolved from the documents, state that a human platform administrator will triage the ticket shortly.
- Do not invent pricing, features, deployment steps, or security tokens.
- Output ONLY the email reply body text. No subject line, salutation boilerplate, or markdown fences.`;

/**
 * Customer Service Agent — drafts support replies for human approval (never auto-sends).
 */
export async function runCustomerServiceAgent(
  tenantId: string,
  contactId: string,
  message: NormalizedEmailMessage,
): Promise<void> {
  try {
    const apiKey = getIronboardApiKey();
    if (!apiKey) {
      console.warn('[Customer Service] Gemini API key missing — draft generation skipped.');
      return;
    }

    const [knowledgeContext, historyContext] = await Promise.all([
      loadLevelOneKnowledgeContext(),
      loadContactHistoryContext(tenantId, contactId),
    ]);

    const inquiryBody = sanitizePromptSegment(message.textBody, MAX_PROMPT_BODY_CHARS);

    const inputPrompt = `=== SHARED KNOWLEDGE BASE ===
${knowledgeContext}

=== PRIOR OPERATOR HISTORY ===
${historyContext}

=== INCOMING CUSTOMER INQUIRY ===
From: ${sanitizePromptSegment(message.from, 320)}
Subject: ${sanitizePromptSegment(message.subject, 500)}
Message Body:
${inquiryBody}

Generate the pending draft email response text:`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: getIronboardGeminiModel(),
      contents: inputPrompt,
      config: {
        systemInstruction: CUSTOMER_SERVICE_SYSTEM_INSTRUCTION,
        temperature: DETERMINISTIC_GENERATION_PARAMS.temperature,
        topP: DETERMINISTIC_GENERATION_PARAMS.topP,
        maxOutputTokens: 1_024,
      },
    });

    const renderedDraft =
      response.text?.trim() ||
      'Automated synthesis could not produce a grounded reply from the available documentation.';

    const consolidatedSummary = sanitizePromptSegment(
      [
        `[PENDING DRAFT APPROVAL] Re: ${message.subject}`,
        '--- Agent Proposed Reply Text ---',
        renderedDraft,
        '--- Tracking Core ---',
        `Execution Source: agentCustomerService | Source Ingress Resend ID: ${message.emailId}`,
      ].join('\n'),
      MAX_DRAFT_SUMMARY_CHARS,
    );

    await logInteraction(tenantId, {
      contactId,
      channel: 'EMAIL',
      summary: consolidatedSummary,
      occurredAt: new Date().toISOString(),
    });

    console.log(
      `[Customer Service] Pending draft logged for contact [${contactId}] tenant [${tenantId}]`,
    );
  } catch (agentError) {
    console.error('[Customer Service] Agent execution failed:', agentError);
  }
}
