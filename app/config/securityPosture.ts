/** Nuclear override security posture — key ceremony topology. */
export const SECURITY_POSTURE_DUAL_LOCK = "DUAL_LOCK" as const;
export const SECURITY_POSTURE_TRIPARTITE_LOCK = "TRIPARTITE_LOCK" as const;

export type SecurityPosture =
  | typeof SECURITY_POSTURE_DUAL_LOCK
  | typeof SECURITY_POSTURE_TRIPARTITE_LOCK;

export const SECURITY_POSTURE_LABELS: Record<SecurityPosture, string> = {
  DUAL_LOCK: "Dual-Lock (System + Human)",
  TRIPARTITE_LOCK: "Tripartite-Lock (System + CISO + Staff)",
};

export function isSecurityPosture(value: string | null | undefined): value is SecurityPosture {
  return value === SECURITY_POSTURE_DUAL_LOCK || value === SECURITY_POSTURE_TRIPARTITE_LOCK;
}
