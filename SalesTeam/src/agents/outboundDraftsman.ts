import { resolveBeachheadPrompt, type BeachheadSector } from '../config/beachheadPrompts.js';
import {
  DESIGN_PARTNER_PATH_B_USD,
  PLANNED_GA_COMMAND_USD,
} from '../config/designPartnerLaunchMandate.js';
import { DESIGN_PARTNER_DEFAULT_WINDOW_DAYS } from '../../../lib/ironframeProductKnowledge/commercial.js';
import { validateStoryBrandDraft } from '../config/storybrandGuidelines.js';
import type { ProspectRecord } from '../lib/crmPollClient.js';
import type { OutreachChannel } from '../loadSalesTeamEnv.js';

export type OutboundDraft = {
  subject: string;
  body: string;
  channel: OutreachChannel;
  industrySector: BeachheadSector;
  lossExposureCents: string;
  storyBrandOk: boolean;
  contentQualityOk: boolean;
  contentQualityViolations: string[];
};

export { DESIGN_PARTNER_PATH_B_USD, PLANNED_GA_COMMAND_USD };

/** Customer-facing positioning only — never include anti-hallucination / operator instructions. */
const CUSTOMER_SAFE_POSITIONING =
  'Ironframe is a control-first GRC platform — quantified risk in whole cents, strict tenant isolation, and auditor-ready evidence — not heatmap theater or spreadsheet governance.';

const TRIGGER_LABELS: Record<string, string> = {
  COMPLIANCE_JOB_POST: 'a compliance or GRC hiring signal',
  NEW_CISO: 'a new security leadership signal',
  REG_FINE: 'recent regulatory pressure',
  M_AND_A: 'an M&A or integration governance signal',
  BREACH_DISCLOSURE: 'a recent breach or disclosure signal',
};

const CONTENT_QUALITY_BANNED = [
  'anti-hallucination',
  'never invent portals',
  'knowledge bases',
  'ironframe governance frame',
  'compliance_job_post',
  'medshield',
  'vaultbank',
  'gridcore',
  'bigint',
  'irongate dmz',
  'rls +',
  'pending operator approval',
  'in this story, not us',
  'wedge:',
  '[cadence:',
] as const;

function formatCentsDisplay(valueCents: string): string {
  try {
    const cents = BigInt(valueCents || '0');
    const dollars = cents / 100n;
    const remainder = cents % 100n;
    return `$${dollars.toString()}.${remainder.toString().padStart(2, '0')}`;
  } catch {
    return '$0.00';
  }
}

function firstName(fullName: string): string {
  return fullName.split(' ')[0] || 'there';
}

/** Turn CRM trigger enums into plain English for outbound copy. */
export function humanizeDetectedTrigger(raw: string | null | undefined): string {
  const trimmed = raw?.trim() || '';
  if (!trimmed) return 'recent governance pressure';
  const key = trimmed.toUpperCase().replace(/\s+/g, '_');
  if (TRIGGER_LABELS[key]) return TRIGGER_LABELS[key];
  if (/^[A-Z0-9_]+$/.test(trimmed)) {
    return trimmed.toLowerCase().replace(/_/g, ' ');
  }
  return trimmed;
}

/** Operator gate: locks alone are not enough — fail on prompt leaks / unfinished templates. */
export function validateOutboundContentQuality(body: string): {
  ok: boolean;
  violations: string[];
} {
  const lower = body.toLowerCase();
  const violations: string[] = [];

  for (const banned of CONTENT_QUALITY_BANNED) {
    if (lower.includes(banned)) {
      violations.push(`banned fragment: ${banned}`);
    }
  }
  if (/\$0\.00/.test(body) && /loss exposure/i.test(body)) {
    violations.push('modeled $0.00 loss exposure in outbound body');
  }
  // SCREAMING_SNAKE tokens (e.g. COMPLIANCE_JOB_POST) left unsubstituted in customer copy.
  // Allowlist beachhead sector labels that may appear in operator-only prospect context footers.
  const allowSnake = new Set([
    "PATH_B",
    "HITL",
    "REGIONAL_BHC",
    "UTILITY_NERC",
    "MSSP_ENCLAVE",
    "HEALTH_HIPAA",
  ]);
  const matches = body.match(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g) || [];
  for (const m of matches) {
    if (!allowSnake.has(m)) {
      violations.push(`unsubstituted trigger token: ${m}`);
    }
  }

  return { ok: violations.length === 0, violations };
}

function draftEmailBody(prospect: ProspectRecord, prompt: ReturnType<typeof resolveBeachheadPrompt>): string {
  const hasModeledLoss = Boolean(prospect.valueCents && prospect.valueCents !== '0');
  const lossDisplay = hasModeledLoss ? formatCentsDisplay(prospect.valueCents) : null;
  const trigger = humanizeDetectedTrigger(prospect.detectedTrigger);

  const guideBlock = lossDisplay
    ? `Ironframe helps teams like yours ${prompt.guidePlan} — including ${prompt.wedgeCentsNarrative} (about ${lossDisplay} in modeled governed loss exposure, whole cents only).`
    : `Ironframe helps teams like yours ${prompt.guidePlan} — including ${prompt.wedgeCentsNarrative}.`;

  return [
    `Hi ${firstName(prospect.fullName)},`,
    '',
    `You're leading ${prompt.heroRole} work at ${prospect.company}, so you're the decision-maker on how governance evidence reaches the board.`,
    '',
    `We noticed ${trigger}. Quick question: how does your team handle ${prompt.complianceHook} evidence today — especially where heatmaps or spreadsheets still feed leadership reporting?`,
    '',
    guideBlock,
    '',
    CUSTOMER_SAFE_POSITIONING,
    '',
    `We're recruiting a small paid design-partner cohort — Command Tier / Path B $${DESIGN_PARTNER_PATH_B_USD}, ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day window, 2–3 success criteria you set, weekly eng syncs then async. Planned GA for Ironframe Command is ~$${PLANNED_GA_COMMAND_USD}/yr.`,
    '',
    'If that friction is real on your side, the next step is a 10–15 minute workflow review on evidence / board-report pain — not a product preview.',
    '',
    '— Ironframe',
  ].join('\n');
}

function draftSmsBody(prospect: ProspectRecord): string {
  return [
    `${firstName(prospect.fullName)} — Ironframe paid co-builder (Command Tier $${DESIGN_PARTNER_PATH_B_USD}, ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day window).`,
    'Quantified GRC, not heatmaps. 10-15 min workflow review on your evidence pain?',
    'Reply YES or stop.',
  ].join(' ');
}

export function draftOutboundMessage(
  prospect: ProspectRecord,
  channel: OutreachChannel,
): OutboundDraft {
  const sector = (prospect.industrySector ?? 'REGIONAL_BHC') as BeachheadSector;
  const prompt = resolveBeachheadPrompt(sector);
  const lossExposureCents = prospect.valueCents && prospect.valueCents !== '0' ? prospect.valueCents : '0';

  const subject = `Question about ${prompt.complianceHook} workflow at ${prospect.company}`;
  const body = channel === 'SMS' ? draftSmsBody(prospect) : draftEmailBody(prospect, prompt);
  const storyBrand = validateStoryBrandDraft(body);
  const contentQuality = validateOutboundContentQuality(body);

  return {
    subject,
    body,
    channel,
    industrySector: prompt.sector,
    lossExposureCents,
    storyBrandOk: storyBrand.ok,
    contentQualityOk: contentQuality.ok,
    contentQualityViolations: contentQuality.violations,
  };
}
