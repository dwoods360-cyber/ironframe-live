import { LEAD_STAGES, isLeadStage } from '../types/crm.js';
import type { CreateContactInput, InteractionChannel, LeadStage, LogInteractionInput } from '../types/crm.js';
import { SALES_METHODOLOGY_IDS } from '../types/salesKnowledge.js';
import {
  createContact,
  createDeal,
  createLeadBundle,
  getDeal,
  listContacts,
  listPipeline,
  logInteraction,
  updateDealStage,
  updateDealValue,
} from '../services/crm/crmService.js';
import {
  evaluateDealStageAlignment,
  exportPlaybookBlueprint,
  listPlaybookCatalog,
  parseOutreachStrategyDraft,
  validateOutreachStrategy,
} from '../services/crm/knowledge/methodologyValidation.js';

export const CRM_TOOL_ACTIONS = [
  'list_pipeline',
  'get_deal',
  'list_contacts',
  'create_contact',
  'create_deal',
  'create_lead',
  'update_deal_stage',
  'update_deal_value',
  'log_interaction',
  'list_sales_playbooks',
  'get_sales_playbook',
  'validate_outreach_strategy',
  'evaluate_deal_stage',
] as const;

export type CrmToolAction = (typeof CRM_TOOL_ACTIONS)[number];

export const MANAGE_CRM_PIPELINE_DECLARATION = {
  name: 'manageCrmPipeline',
  description:
    'Read and write the IronBoard B2B sales CRM for a single tenant workspace. All deal values are whole-cent BIGINT integers (no floats). Outreach and stage moves may include methodologyId to validate against ingested playbooks (Challenger, SPIN, Gap, Sales Acceleration, Never Split the Difference). Always pass tenantId.',
  parameters: {
    type: 'OBJECT',
    properties: {
      action: {
        type: 'STRING',
        description: 'CRM operation to execute.',
        enum: [...CRM_TOOL_ACTIONS],
      },
      tenantId: {
        type: 'STRING',
        description: 'Workspace tenant UUID — required for every action (RLS-bound).',
      },
      dealId: { type: 'STRING', description: 'Target deal UUID for get/update/log actions.' },
      contactId: { type: 'STRING', description: 'Target contact UUID for deal creation or interaction logs.' },
      stage: {
        type: 'STRING',
        description: 'Pipeline stage for create_deal or update_deal_stage.',
        enum: [...LEAD_STAGES],
      },
      valueCents: {
        type: 'STRING',
        description: 'Whole-cent deal value as integer string (e.g. "250000000" for $2.5M).',
      },
      title: { type: 'STRING', description: 'Deal title for create_deal / create_lead.' },
      fullName: { type: 'STRING', description: 'Contact full name for create_contact / create_lead.' },
      email: { type: 'STRING', description: 'Contact email for create_contact / create_lead.' },
      company: { type: 'STRING', description: 'Contact company for create_contact / create_lead.' },
      contactTitle: { type: 'STRING', description: 'Contact job title.' },
      phone: { type: 'STRING', description: 'Optional contact phone.' },
      accountDomain: { type: 'STRING', description: 'Optional account domain for the deal.' },
      ownerAgentId: { type: 'STRING', description: 'Optional board agent id owning the deal.' },
      notes: { type: 'STRING', description: 'Freeform deal notes.' },
      channel: {
        type: 'STRING',
        description: 'Interaction channel for log_interaction.',
        enum: ['EMAIL', 'CALL', 'MEETING', 'LINKEDIN', 'NOTE', 'OTHER'],
      },
      summary: { type: 'STRING', description: 'Interaction summary for log_interaction.' },
      occurredAt: { type: 'STRING', description: 'ISO timestamp for log_interaction (defaults to now).' },
      limit: { type: 'NUMBER', description: 'Optional max rows when listing pipeline segments (1–100).' },
      methodologyId: {
        type: 'STRING',
        description: 'Sales playbook id for validation or stage evaluation.',
        enum: [...SALES_METHODOLOGY_IDS],
      },
      headline: { type: 'STRING', description: 'Outreach strategy headline for validate_outreach_strategy.' },
      matrixResponses: {
        type: 'OBJECT',
        description: 'Key/value map aligned to playbook matrix sections (e.g. situation, problem, gapMetrics).',
      },
      nextActions: {
        type: 'STRING',
        description: 'Pipe-delimited next actions for validate_outreach_strategy, or array in JSON.',
      },
    },
    required: ['action', 'tenantId'],
  },
};

const INTERACTION_CHANNELS = new Set<string>(['EMAIL', 'CALL', 'MEETING', 'LINKEDIN', 'NOTE', 'OTHER']);

function parseChannel(raw: unknown): InteractionChannel {
  const channel = String(raw ?? 'NOTE').trim().toUpperCase();
  if (!INTERACTION_CHANNELS.has(channel)) {
    throw new Error(`Invalid interaction channel "${channel}"`);
  }
  return channel as InteractionChannel;
}

function parseStage(raw: unknown): LeadStage | undefined {
  const stage = String(raw ?? '').trim();
  if (!stage) return undefined;
  if (!isLeadStage(stage)) throw new Error(`Invalid stage "${stage}"`);
  return stage;
}

function contactInputFromArgs(raw: Record<string, unknown>): CreateContactInput {
  return {
    fullName: String(raw.fullName ?? ''),
    email: String(raw.email ?? ''),
    company: String(raw.company ?? ''),
    title: raw.contactTitle ? String(raw.contactTitle) : undefined,
    phone: raw.phone ? String(raw.phone) : null,
  };
}

function hasStrategyPayload(raw: Record<string, unknown>): boolean {
  return Boolean(
    raw.methodologyId &&
      (String(raw.headline ?? '').trim() ||
        (raw.matrixResponses && typeof raw.matrixResponses === 'object')),
  );
}

export async function executeManageCrmPipeline(
  raw: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const action = String(raw.action ?? '').trim() as CrmToolAction;
  const tenantId = raw.tenantId;

  try {
    switch (action) {
      case 'list_pipeline': {
        const pipeline = await listPipeline(tenantId);
        const limit = Math.min(Math.max(Number(raw.limit) || 100, 1), 100);
        return {
          ok: true,
          action,
          pipeline: {
            ...pipeline,
            deals: pipeline.deals.slice(0, limit),
            contacts: pipeline.contacts.slice(0, limit),
            interactions: pipeline.interactions.slice(0, limit),
          },
        };
      }
      case 'get_deal':
        return { ok: true, action, deal: await getDeal(tenantId, raw.dealId) };
      case 'list_contacts':
        return { ok: true, action, contacts: await listContacts(tenantId) };
      case 'create_contact':
        return { ok: true, action, contact: await createContact(tenantId, contactInputFromArgs(raw)) };
      case 'create_deal':
        return {
          ok: true,
          action,
          deal: await createDeal(tenantId, {
            title: String(raw.title ?? ''),
            stage: parseStage(raw.stage),
            valueCents: String(raw.valueCents ?? '0'),
            primaryContactId: String(raw.contactId ?? ''),
            accountDomain: raw.accountDomain ? String(raw.accountDomain) : null,
            ownerAgentId: raw.ownerAgentId ? String(raw.ownerAgentId) : null,
            notes: raw.notes ? String(raw.notes) : '',
          }),
        };
      case 'create_lead': {
        const bundle = await createLeadBundle(tenantId, contactInputFromArgs(raw), {
          title: String(raw.title ?? ''),
          stage: parseStage(raw.stage),
          valueCents: String(raw.valueCents ?? '0'),
          accountDomain: raw.accountDomain ? String(raw.accountDomain) : null,
          ownerAgentId: raw.ownerAgentId ? String(raw.ownerAgentId) : null,
          notes: raw.notes ? String(raw.notes) : '',
        });
        return { ok: true, action, ...bundle };
      }
      case 'update_deal_stage': {
        const deal = await updateDealStage(tenantId, raw.dealId, raw.stage);
        const methodologyId = raw.methodologyId;
        const evaluation =
          methodologyId != null && String(methodologyId).trim()
            ? evaluateDealStageAlignment(methodologyId, deal.stage)
            : null;
        return {
          ok: evaluation ? evaluation.ok : true,
          action,
          deal,
          ...(evaluation ? { methodologyEvaluation: evaluation } : {}),
        };
      }
      case 'update_deal_value':
        return {
          ok: true,
          action,
          deal: await updateDealValue(tenantId, raw.dealId, raw.valueCents),
        };
      case 'log_interaction': {
        const input: LogInteractionInput = {
          dealId: raw.dealId ? String(raw.dealId) : null,
          contactId: raw.contactId ? String(raw.contactId) : null,
          channel: parseChannel(raw.channel),
          summary: String(raw.summary ?? ''),
          occurredAt: raw.occurredAt ? String(raw.occurredAt) : undefined,
        };
        const interaction = await logInteraction(tenantId, input);
        if (hasStrategyPayload(raw)) {
          const validation = validateOutreachStrategy(parseOutreachStrategyDraft(raw));
          return {
            ok: validation.ok,
            action,
            interaction,
            methodologyValidation: validation,
          };
        }
        return { ok: true, action, interaction };
      }
      case 'list_sales_playbooks':
        return { ok: true, action, playbooks: listPlaybookCatalog() };
      case 'get_sales_playbook':
        return { ok: true, action, playbook: exportPlaybookBlueprint(raw.methodologyId) };
      case 'validate_outreach_strategy': {
        const validation = validateOutreachStrategy(parseOutreachStrategyDraft(raw));
        return { ok: validation.ok, action, validation };
      }
      case 'evaluate_deal_stage': {
        const evaluation = evaluateDealStageAlignment(raw.methodologyId, raw.stage ?? raw.dealStage);
        return { ok: evaluation.ok, action, evaluation };
      }
      default:
        return {
          ok: false,
          error: `Unknown action "${action}". Use one of: ${CRM_TOOL_ACTIONS.join(', ')}.`,
        };
    }
  } catch (err) {
    return {
      ok: false,
      action,
      error: err instanceof Error ? err.message : 'CRM operation failed',
    };
  }
}

export const manageCrmPipeline = executeManageCrmPipeline;
