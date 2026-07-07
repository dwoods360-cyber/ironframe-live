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

export function draftOutboundMessage(
  prospect: ProspectRecord,
  channel: OutreachChannel,
): OutboundDraft {
  const sector = (prospect.industrySector ?? 'REGIONAL_BHC') as BeachheadSector;
  const prompt = resolveBeachheadPrompt(sector);
  const lossExposureCents = prospect.valueCents && prospect.valueCents !== '0' ? prospect.valueCents : '0';
  const lossDisplay = formatCentsDisplay(lossExposureCents);
  const trigger = prospect.detectedTrigger?.trim() || 'recent governance pressure';

  const subject = `Clear plan for ${prospect.company} — ${prompt.complianceHook}`;

  const body = [
    `Hi ${prospect.fullName.split(' ')[0] || 'there'},`,
    '',
    `You are leading ${prompt.heroRole} work at ${prospect.company} — that makes you the hero in this story, not us.`,
    '',
    `We noticed ${trigger}. Ironframe acts as the guide: we help you ${prompt.guidePlan}.`,
    '',
    `Our wedge is simple: ${prompt.wedgeCentsNarrative}. For your profile we model ${lossDisplay} in governed loss exposure (whole cents only — no float drift).`,
    '',
    'Proposed next step: a 20-minute operator walkthrough of your tenant-scoped command post — no generic checklist, one clear plan.',
    '',
    '— Ironframe Governance Frame (pending your operator approval before send)',
  ].join('\n');

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
