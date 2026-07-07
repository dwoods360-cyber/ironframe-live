import {
  ADJACENT_SECTORS,
  BEACHHEAD_SECTORS,
  LEAD_INGESTION_SOURCES,
  LEAD_STAGES,
  isAdjacentSector,
  isLeadIngestionSource,
  isLeadStage,
  isBeachheadSector,
} from '../types/crm.js';
import type { CreateContactInput, InteractionChannel, LeadStage, LogInteractionInput } from '../types/crm.js';
import { SALES_METHODOLOGY_IDS } from '../types/salesKnowledge.js';
import {
  createContact,
  createDeal,
  createLeadBundle,
  getDeal,
  listContacts,
  listPipeline,
  listPrioritizedLeads,
  logInteraction,
  promoteSuspectDeal,
  updateContactQualification,
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
import { executeLeadGenKnowledgeTool } from '../services/crm/knowledge/leadGenKnowledgeBridge.js';

export const CRM_TOOL_ACTIONS = [
  'list_pipeline',
  'get_deal',
  'list_contacts',
  'list_prioritized_leads',
  'create_contact',
  'create_deal',
  'create_lead',
  'update_deal_stage',
  'update_deal_value',
  'update_qualification',
  'promote_suspect_deal',
  'log_interaction',
  'list_sales_playbooks',
  'get_sales_playbook',
  'validate_outreach_strategy',
  'evaluate_deal_stage',
  'list_leadgen_knowledge',
  'get_leadgen_entry',
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
      industrySector: {
        type: 'STRING',
        description: 'Beachhead vertical for GTM qualification scoring.',
        enum: [...BEACHHEAD_SECTORS],
      },
      adjacentSector: {
        type: 'STRING',
        description:
          'Ring-2 adjacent vertical when not a core beachhead (partial market-fit score ~0.55).',
        enum: [...ADJACENT_SECTORS],
      },
      detectedTrigger: {
        type: 'STRING',
        description: 'Comma-separated trigger tags (e.g. NEW_CISO, REG_FINE).',
      },
      ingestionSource: {
        type: 'STRING',
        description:
          'Lead lineage — MANUAL_INPUT, INBOUND_PORTAL, AUTONOMOUS_CRAWLER, or PARTNER_REFERRAL.',
        enum: [...LEAD_INGESTION_SOURCES],
      },
      painManualBoardReporting: {
        type: 'BOOLEAN',
        description: 'Discovery: stale/manual board cyber reporting.',
      },
      painNoDollarRiskQuant: {
        type: 'BOOLEAN',
        description: 'Discovery: cannot quantify cyber risk in dollars.',
      },
      painFragmentedGrc: {
        type: 'BOOLEAN',
        description: 'Discovery: spreadsheets / fragmented GRC tools.',
      },
      painMultiEntityGovernance: {
        type: 'BOOLEAN',
        description: 'Discovery: multi-entity isolation challenges.',
      },
      icpConfirmed: {
        type: 'BOOLEAN',
        description:
          'Agent attests ICP-fit with actionable control context (Q-confirmed for Gate B). Use with update_qualification.',
      },
      firstActionType: {
        type: 'STRING',
        description:
          'Typed GRC auditable work artifact for log_interaction (VENDOR_ASSESSMENT, CONTROL_MAPPING, QUESTIONNAIRE, REMEDIATION).',
        enum: ['VENDOR_ASSESSMENT', 'CONTROL_MAPPING', 'QUESTIONNAIRE', 'REMEDIATION', 'OTHER'],
      },
      methodologyCommercialInsight: {
        type: 'BOOLEAN',
        description: 'Challenger: commercial insight delivered (not feature dump).',
      },
      methodologySpinReduced: {
        type: 'BOOLEAN',
        description: 'SPIN: reduced basic Situation questioning via pre-call intel.',
      },
      accountDomain: { type: 'STRING', description: 'Optional account domain for the deal.' },
      ownerAgentId: { type: 'STRING', description: 'Optional board agent id owning the deal.' },
      notes: { type: 'STRING', description: 'Freeform deal notes.' },
      channel: {
        type: 'STRING',
        description: 'Interaction channel for log_interaction.',
        enum: ['EMAIL', 'CALL', 'MEETING', 'LINKEDIN', 'NOTE', 'SYSTEM_AGENT', 'OTHER'],
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
      knowledgeId: {
        type: 'STRING',
        description: 'Ironleads knowledge entry id for get_leadgen_entry.',
      },
      searchQuery: {
        type: 'STRING',
        description: 'Search Ironleads lead-gen corpus (list_leadgen_knowledge).',
      },
      kind: {
        type: 'STRING',
        description: 'Filter lead-gen entries: book, strategy, or framework.',
      },
      category: {
        type: 'STRING',
        description: 'Filter lead-gen entries by category (e.g. trigger_intelligence).',
      },
      trigger: {
        type: 'STRING',
        description: 'Filter lead-gen entries by trigger signal (e.g. REG_FINE).',
      },
    },
    required: ['action', 'tenantId'],
  },
};

const INTERACTION_CHANNELS = new Set<string>([
  'EMAIL',
  'CALL',
  'MEETING',
  'LINKEDIN',
  'NOTE',
  'SYSTEM_AGENT',
  'OTHER',
]);

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

function parseBool(raw: unknown): boolean | undefined {
  if (raw === true || raw === 'true' || raw === 1 || raw === '1') return true;
  if (raw === false || raw === 'false' || raw === 0 || raw === '0') return false;
  return undefined;
}

function painMarkersFromArgs(raw: Record<string, unknown>) {
  const manualBoardReporting = parseBool(raw.painManualBoardReporting);
  const noDollarRiskQuant = parseBool(raw.painNoDollarRiskQuant);
  const fragmentedGrc = parseBool(raw.painFragmentedGrc);
  const multiEntityGovernance = parseBool(raw.painMultiEntityGovernance);
  if (
    manualBoardReporting === undefined &&
    noDollarRiskQuant === undefined &&
    fragmentedGrc === undefined &&
    multiEntityGovernance === undefined
  ) {
    return undefined;
  }
  return {
    ...(manualBoardReporting !== undefined ? { manualBoardReporting } : {}),
    ...(noDollarRiskQuant !== undefined ? { noDollarRiskQuant } : {}),
    ...(fragmentedGrc !== undefined ? { fragmentedGrc } : {}),
    ...(multiEntityGovernance !== undefined ? { multiEntityGovernance } : {}),
  };
}

function methodologyFromArgs(raw: Record<string, unknown>) {
  const commercialInsightDelivered = parseBool(raw.methodologyCommercialInsight);
  const spinSituationReduced = parseBool(raw.methodologySpinReduced);
  if (commercialInsightDelivered === undefined && spinSituationReduced === undefined) {
    return undefined;
  }
  return {
    ...(commercialInsightDelivered !== undefined ? { commercialInsightDelivered } : {}),
    ...(spinSituationReduced !== undefined ? { spinSituationReduced } : {}),
  };
}

function contactInputFromArgs(raw: Record<string, unknown>): CreateContactInput {
  const industrySectorRaw = String(raw.industrySector ?? '').trim();
  const adjacentSectorRaw = String(raw.adjacentSector ?? '').trim();
  const ingestionSourceRaw = String(raw.ingestionSource ?? '').trim();
  return {
    fullName: String(raw.fullName ?? ''),
    email: String(raw.email ?? ''),
    company: String(raw.company ?? ''),
    title: raw.contactTitle ? String(raw.contactTitle) : undefined,
    phone: raw.phone ? String(raw.phone) : null,
    industrySector:
      industrySectorRaw && isBeachheadSector(industrySectorRaw) ? industrySectorRaw : undefined,
    adjacentSector:
      adjacentSectorRaw && isAdjacentSector(adjacentSectorRaw) ? adjacentSectorRaw : undefined,
    detectedTrigger: raw.detectedTrigger ? String(raw.detectedTrigger) : undefined,
    ingestionSource:
      ingestionSourceRaw && isLeadIngestionSource(ingestionSourceRaw)
        ? ingestionSourceRaw
        : undefined,
    painMarkers: painMarkersFromArgs(raw),
    methodology: methodologyFromArgs(raw),
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
      case 'list_prioritized_leads':
        return {
          ok: true,
          action,
          prioritized: await listPrioritizedLeads(tenantId, raw.limit),
        };
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
      case 'update_qualification':
        return {
          ok: true,
          action,
          contact: await updateContactQualification(tenantId, {
            contactId: String(raw.contactId ?? ''),
            industrySector:
              raw.industrySector == null
                ? raw.industrySector === null
                  ? null
                  : undefined
                : isBeachheadSector(String(raw.industrySector))
                  ? (String(raw.industrySector) as (typeof BEACHHEAD_SECTORS)[number])
                  : undefined,
            adjacentSector:
              raw.adjacentSector == null
                ? raw.adjacentSector === null
                  ? null
                  : undefined
                : isAdjacentSector(String(raw.adjacentSector))
                  ? (String(raw.adjacentSector) as (typeof ADJACENT_SECTORS)[number])
                  : undefined,
            detectedTrigger:
              raw.detectedTrigger !== undefined ? String(raw.detectedTrigger) : undefined,
            icpConfirmed: parseBool(raw.icpConfirmed),
            painMarkers: painMarkersFromArgs(raw),
            methodology: methodologyFromArgs(raw),
          }),
        };
      case 'promote_suspect_deal':
        return {
          ok: true,
          action,
          deal: await promoteSuspectDeal(tenantId, raw.dealId),
        };
      case 'log_interaction': {
        const firstActionTypeRaw = String(raw.firstActionType ?? '').trim();
        const input: LogInteractionInput = {
          dealId: raw.dealId ? String(raw.dealId) : null,
          contactId: raw.contactId ? String(raw.contactId) : null,
          channel: parseChannel(raw.channel),
          summary: String(raw.summary ?? ''),
          occurredAt: raw.occurredAt ? String(raw.occurredAt) : undefined,
          ...(firstActionTypeRaw
            ? {
                firstActionType: firstActionTypeRaw as LogInteractionInput['firstActionType'],
              }
            : {}),
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
      case 'list_leadgen_knowledge':
      case 'get_leadgen_entry':
        return executeLeadGenKnowledgeTool(raw);
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
