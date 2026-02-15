export const RETENTION_PERIOD_DAYS = 2555;

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;

export function maskSensitiveData(input: string) {
  return input.replace(EMAIL_REGEX, "[MASKED_EMAIL]").replace(SSN_REGEX, "[MASKED_SSN]");
}

export function getRetentionStatusLabel() {
  return `Retention Status: ACTIVE (${RETENTION_PERIOD_DAYS} days)`;
}
