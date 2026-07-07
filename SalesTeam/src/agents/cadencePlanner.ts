import type { OutreachChannel } from '../loadSalesTeamEnv.js';

export type CadencePlan = {
  channel: OutreachChannel;
  followUpDelayHours: number;
  maxTouches: number;
  rationale: string;
};

/** First-touch cadence for newly promoted PROSPECT deals. */
export function planProspectCadence(priorityScore: number, channel: OutreachChannel): CadencePlan {
  if (priorityScore >= 75) {
    return {
      channel,
      followUpDelayHours: 48,
      maxTouches: 3,
      rationale: 'HIGH priority — accelerated follow-up within 48h',
    };
  }
  if (priorityScore >= 50) {
    return {
      channel,
      followUpDelayHours: 72,
      maxTouches: 2,
      rationale: 'MEDIUM priority — standard 72h nurture window',
    };
  }
  return {
    channel,
    followUpDelayHours: 120,
    maxTouches: 1,
    rationale: 'LOW priority — single touch; operator may promote manually',
  };
}
