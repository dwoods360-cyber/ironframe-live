/**
 * SalesTeam launch mandate — re-exports canonical Path B constants from the product-knowledge spine.
 * Source of truth: lib/ironframeProductKnowledge (docs/sales/design-partner-workforce-briefing.md).
 */
export {
  DESIGN_PARTNER_PATH_B_USD,
  PLANNED_GA_COMMAND_USD,
  DESIGN_PARTNER_PATH_B_CENTS,
  PLANNED_GA_COMMAND_CENTS,
} from '../../../lib/ironframeProductKnowledge/commercial.js';
export { buildSalesTeamLaunchMandate as buildDesignPartnerLaunchMandate } from '../../../lib/ironframeProductKnowledge/boardBinding.js';

import { buildSalesTeamLaunchMandate } from '../../../lib/ironframeProductKnowledge/boardBinding.js';

export const DESIGN_PARTNER_LAUNCH_MANDATE = buildSalesTeamLaunchMandate();
