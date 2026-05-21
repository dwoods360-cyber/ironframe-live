/**
 * Legacy entry name — remediation now fans out via `NotificationEndpoint` + Irongate.
 * @deprecated Import `sendRemediationStakeholderBroadcast` from `./remediationBroadcast`.
 */
export { sendRemediationStakeholderBroadcast as sendRemediationSlackWebhook } from "./remediationBroadcast";
