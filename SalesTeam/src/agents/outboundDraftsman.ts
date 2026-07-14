import { resolveBeachheadPrompt, type BeachheadSector } from '../config/beachheadPrompts.js';
import {
  DESIGN_PARTNER_PATH_B_USD,
  PLANNED_GA_COMMAND_USD,
} from '../config/designPartnerLaunchMandate.js';
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
};

export { DESIGN_PARTNER_PATH_B_USD, PLANNED_GA_COMMAND_USD };

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

function draftEmailBody(prospect: ProspectRecord, prompt: ReturnType<typeof resolveBeachheadPrompt>): string {
  const lossDisplay = formatCentsDisplay(
    prospect.valueCents && prospect.valueCents !== '0' ? prospect.valueCents : '0',
  );
  const trigger = prospect.detectedTrigger?.trim() || 'recent governance pressure';

  return [
    `Hi ${firstName(prospect.fullName)},`,
    '',
    `You're leading ${prompt.heroRole} work at ${prospect.company} — that makes you the decision-maker in this story, not us.`,
    '',
    `We noticed ${trigger}. Quick question on how your team handles ${prompt.complianceHook} evidence today — especially where heatmaps or spreadsheets still feed the board.`,
    '',
    `Ironframe is the guide: we help you ${prompt.guidePlan}. Wedge: ${prompt.wedgeCentsNarrative}. For your profile we model ${lossDisplay} in governed loss exposure (whole cents only).`,
    '',
    `We're recruiting a small paid co-builder cohort — Command Tier / Path B $${DESIGN_PARTNER_PATH_B_USD}, 60-90 days, 2-3 success criteria you set, weekly eng syncs capped then async. Planned GA Ironframe Command ~$${PLANNED_GA_COMMAND_USD}/yr.`,
    '',
    'If the pain is real on your side, proposed next step is a 10-15 minute workflow review on evidence / board-report friction — not a product preview.',
    '',
    '— Ironframe Governance Frame (pending your operator approval before send)',
  ].join('\n');
}

function draftSmsBody(prospect: ProspectRecord): string {
  return [
    `${firstName(prospect.fullName)} — Ironframe paid co-builder (Command Tier $${DESIGN_PARTNER_PATH_B_USD}, 60-90 days).`,
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

  return {
    subject,
    body,
    channel,
    industrySector: prompt.sector,
    lossExposureCents,
    storyBrandOk: storyBrand.ok,
  };
}
