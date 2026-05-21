/**
 * Compatibility entry — consecutive-failure / stale-data threshold for Ironwatch is implemented in
 * `apiHeartbeat.ts` (`IRONWATCH_MIN_CONSECUTIVE_FAILURES` = ceil(4h / 15m check interval)).
 */
export {
  IRONWATCH_CHECK_INTERVAL_MS,
  IRONWATCH_MIN_CONSECUTIVE_FAILURES,
  IRONWATCH_SERVICE_KEY_ELECTRICITY_MAPS,
  IRONWATCH_STALE_DATA_THRESHOLD_MS,
  runIronwatchElectricityMapsHeartbeat,
  type IronwatchHeartbeatRunResult,
} from "@/src/services/ironwatch/apiHeartbeat";
