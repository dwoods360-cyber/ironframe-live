import { resolveBeachheadPrompt, type BeachheadSector } from '../config/beachheadPrompts.js';
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

/** Path B / Command Tier design-partner on-ramp (BigInt cents display elsewhere). */
export const DESIGN_PARTNER_PATH_B_USD = 4999;
export const PLANNED_GA_COMMAND_USD = 35_000;

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
    `We noticed ${trigger}. Ironframe acts as the guide: we help you ${prompt.guidePlan}.`,
    '',
    `Our wedge: ${prompt.wedgeCentsNarrative}. For your profile we model ${lossDisplay} in governed loss exposure (whole cents only).`,
    '',
    `We're filling a small paid co-builder cohort — Command Tier / Path B on-ramp $${DESIGN_PARTNER_PATH_B_USD}, 60-90 days, 2-3 success criteria you set, weekly eng syncs capped then async. Planned GA Ironframe Command ~$${PLANNED_GA_COMMAND_USD}/yr.`,
    '',
    'Proposed next step: a 10-15 minute workflow review on your evidence / board-report pain — not a product preview.',
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

  const subject = `Co-builder seat for ${prospect.company} — Command Tier ($${DESIGN_PARTNER_PATH_B_USD})`;
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
