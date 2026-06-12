/**
 * Re-export constitutional application boundary register for Ironframe (:3000).
 * Canonical source: Ironboard/src/orchestrator/platformApplicationBoundary.ts
 */
export {
  APPLICATION_LAYOUT_MATRIX_REGISTER,
  IRONBOARD_DOMAIN_BOUNDARY,
  IRONBOARD_ENDPOINTS,
  IRONBOARD_PORT,
  IRONFRAME_DOMAIN_BOUNDARY,
  IRONFRAME_ENDPOINTS,
  IRONFRAME_PORT,
  ZERO_CROSS_CONTAMINATION_DIRECTIVE,
  buildIronboardOrchestrationContext,
  buildIronframeOrchestrationContext,
  isIronboardEndpoint,
  isIronframeEndpoint,
  resolveApplicationContext,
  type PlatformApplication,
} from '../Ironboard/src/orchestrator/platformApplicationBoundary';
