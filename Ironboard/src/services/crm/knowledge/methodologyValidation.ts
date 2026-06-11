import type { LeadStage } from '../../../types/crm.js';
import { isLeadStage } from '../../../types/crm.js';
import type {
  DealStageEvaluation,
  MethodologyValidationResult,
  OutreachStrategyDraft,
  SalesMethodologyId,
  SalesPlaybookBlueprint,
} from '../../../types/salesKnowledge.js';
import { isSalesMethodologyId } from '../../../types/salesKnowledge.js';
import { getSalesPlaybook, listSalesPlaybookSummaries } from './salesPlaybooks.js';

type MatrixSection = {
  key: string;
  prompts: readonly string[];
};

function matrixSections(blueprint: SalesPlaybookBlueprint): MatrixSection[] {
  const matrix = blueprint.matrix as Record<string, readonly string[]>;
  return Object.entries(matrix).map(([key, prompts]) => ({ key, prompts }));
}

function scoreMatrixCoverage(
  blueprint: SalesPlaybookBlueprint,
  responses: Readonly<Record<string, string>>,
): Pick<MethodologyValidationResult, 'score' | 'maxScore' | 'filledSections' | 'missingSections'> {
  const sections = matrixSections(blueprint);
  const filledSections: string[] = [];
  const missingSections: string[] = [];

  for (const section of sections) {
    const response = String(responses[section.key] ?? '').trim();
    if (response.length >= 24) {
      filledSections.push(section.key);
    } else {
      missingSections.push(section.key);
    }
  }

  const maxScore = sections.length * 10;
  const score = filledSections.length * 10;
  return { score, maxScore, filledSections, missingSections };
}

function evaluateRules(
  blueprint: SalesPlaybookBlueprint,
  filledSections: readonly string[],
): string[] {
  const violations: string[] = [];
  const filled = new Set(filledSections);

  for (const rule of blueprint.validationRules) {
    const matched = rule.requiredFields.filter(field => filled.has(field));
    if (matched.length < rule.minFilledSections) {
      violations.push(
        `${rule.id}: requires ${rule.minFilledSections} of [${rule.requiredFields.join(', ')}] — ${rule.description}`,
      );
    }
  }

  return violations;
}

export function validateOutreachStrategy(
  draft: OutreachStrategyDraft,
): MethodologyValidationResult {
  if (!isSalesMethodologyId(draft.methodologyId)) {
    throw new Error(`Unknown methodologyId "${draft.methodologyId}"`);
  }

  const blueprint = getSalesPlaybook(draft.methodologyId);
  const headline = String(draft.headline ?? '').trim();
  const violations: string[] = [];

  if (headline.length < 12) {
    violations.push('headline must be at least 12 characters');
  }
  if (!draft.nextActions.length) {
    violations.push('nextActions must include at least one concrete step');
  }

  const coverage = scoreMatrixCoverage(blueprint, draft.matrixResponses);
  violations.push(...evaluateRules(blueprint, coverage.filledSections));

  const recommendations = [
    ...blueprint.outreachChecklist.filter(
      item => !headline.toLowerCase().includes(item.split(' ')[0]?.toLowerCase() ?? ''),
    ),
    ...coverage.missingSections.map(key => `Expand matrixResponses.${key} with buyer-specific detail.`),
  ].slice(0, 6);

  const ok = violations.length === 0 && coverage.filledSections.length >= 2;

  return {
    ok,
    methodologyId: draft.methodologyId,
    ...coverage,
    violations,
    recommendations,
  };
}

export function evaluateDealStageAlignment(
  methodologyIdRaw: unknown,
  dealStageRaw: unknown,
): DealStageEvaluation {
  const methodologyId = String(methodologyIdRaw ?? '').trim();
  const dealStage = String(dealStageRaw ?? '').trim();

  if (!isSalesMethodologyId(methodologyId)) {
    throw new Error(`Unknown methodologyId "${methodologyId}"`);
  }
  if (!isLeadStage(dealStage)) {
    throw new Error(`Invalid deal stage "${dealStage}"`);
  }

  const blueprint = getSalesPlaybook(methodologyId);
  const violations: string[] = [];
  const applicable = blueprint.applicableStages.includes(dealStage as LeadStage);

  if (!applicable) {
    violations.push(
      `${blueprint.title} is not primary guidance for stage ${dealStage}. Applicable: ${blueprint.applicableStages.join(', ')}.`,
    );
  }

  const guidance = blueprint.stageGuidance[dealStage as LeadStage];
  const checklist = blueprint.outreachChecklist;

  let stageFit: DealStageEvaluation['stageFit'] = 'weak';
  if (applicable && guidance.length >= 2) stageFit = 'strong';
  else if (applicable || guidance.length > 0) stageFit = 'partial';

  return {
    ok: violations.length === 0,
    methodologyId,
    dealStage: dealStage as LeadStage,
    stageFit,
    guidance,
    checklist,
    violations,
  };
}

export function parseOutreachStrategyDraft(raw: Record<string, unknown>): OutreachStrategyDraft {
  const methodologyId = String(raw.methodologyId ?? '').trim();
  if (!isSalesMethodologyId(methodologyId)) {
    throw new Error(`methodologyId must be one of: ${listSalesPlaybookSummaries().map(p => p.id).join(', ')}`);
  }

  const matrixResponses: Record<string, string> = {};
  const matrixRaw = raw.matrixResponses;
  if (matrixRaw && typeof matrixRaw === 'object' && !Array.isArray(matrixRaw)) {
    for (const [key, value] of Object.entries(matrixRaw as Record<string, unknown>)) {
      matrixResponses[key] = String(value ?? '').trim();
    }
  }

  const nextActionsRaw = raw.nextActions;
  const nextActions = Array.isArray(nextActionsRaw)
    ? nextActionsRaw.map(item => String(item).trim()).filter(Boolean)
    : String(nextActionsRaw ?? '')
        .split('|')
        .map(item => item.trim())
        .filter(Boolean);

  return {
    methodologyId,
    dealId: raw.dealId ? String(raw.dealId) : undefined,
    contactId: raw.contactId ? String(raw.contactId) : undefined,
    headline: String(raw.headline ?? ''),
    matrixResponses,
    nextActions,
  };
}

export function listPlaybookCatalog(): ReturnType<typeof listSalesPlaybookSummaries> {
  return listSalesPlaybookSummaries();
}

export function exportPlaybookBlueprint(idRaw: unknown): SalesPlaybookBlueprint {
  const id = String(idRaw ?? '').trim();
  if (!isSalesMethodologyId(id)) {
    throw new Error(`Unknown playbook id "${id}"`);
  }
  return getSalesPlaybook(id);
}
