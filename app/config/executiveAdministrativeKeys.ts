/** Triple-executive administrative keys for TRIPARTITE → DUAL posture downgrade. */
export const EXECUTIVE_ADMIN_KEY_LENGTH = 32;

export const EXECUTIVE_ROLES = ["CEO", "CFO", "CIO"] as const;
export type ExecutiveRole = (typeof EXECUTIVE_ROLES)[number];

export const EXECUTIVE_ADMIN_ENV_KEYS: Record<ExecutiveRole, string> = {
  CEO: "CEO_KEY_AUTH",
  CFO: "CFO_KEY_AUTH",
  CIO: "CIO_KEY_AUTH",
};

export const EXECUTIVE_ADMIN_FIELD_LABELS: Record<ExecutiveRole, string> = {
  CEO: "CEO_KEY_AUTH",
  CFO: "CFO_KEY_AUTH",
  CIO: "CIO_KEY_AUTH",
};
