import type { OutreachChannel } from '../loadSalesTeamEnv.js';
import type { BeachheadSector } from '../config/beachheadPrompts.js';

export type ChannelRoute = {
  channel: OutreachChannel;
  sector: BeachheadSector;
  useSms: boolean;
  useEmail: boolean;
  partnerRoute: boolean;
};

/** Route outreach channel by beachhead — MSSP may prefer partner-led email first. */
export function routeProspectChannel(
  sector: BeachheadSector,
  hasPhone: boolean,
  defaultChannel: OutreachChannel,
): ChannelRoute {
  if (sector === 'MSSP_ENCLAVE') {
    return {
      channel: 'EMAIL',
      sector,
      useSms: false,
      useEmail: true,
      partnerRoute: true,
    };
  }

  if (defaultChannel === 'SMS' && hasPhone) {
    return {
      channel: 'SMS',
      sector,
      useSms: true,
      useEmail: false,
      partnerRoute: false,
    };
  }

  return {
    channel: 'EMAIL',
    sector,
    useSms: false,
    useEmail: true,
    partnerRoute: false,
  };
}
