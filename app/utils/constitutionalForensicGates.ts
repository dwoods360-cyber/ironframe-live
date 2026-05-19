/** Standard GRC forensic minimum (TAS nominal). */
export const FORENSIC_ATTESTATION_MIN_NORMAL = 50;

/** Constitutional void / degraded — high-entropy justification bar. */
export const FORENSIC_ATTESTATION_MIN_VOID = 100;

/** @deprecated Alias — use {@link FORENSIC_ATTESTATION_MIN_VOID}. */
export const FORENSIC_ATTESTATION_MIN_DEGRADED = FORENSIC_ATTESTATION_MIN_VOID;

export const FORENSIC_VOID_JUSTIFICATION_MESSAGE =
  "FORENSIC VOID: 100+ character justification required to override missing TAS.md authority.";

export function forensicAttestationMinForConstitutionalContext(options: {
  isConstitutionalEmergency: boolean;
  constitutionalDegradedMode?: boolean;
}): number {
  if (options.isConstitutionalEmergency || options.constitutionalDegradedMode) {
    return FORENSIC_ATTESTATION_MIN_VOID;
  }
  return FORENSIC_ATTESTATION_MIN_NORMAL;
}

export function forensicAttestationMinForDegradedMode(degraded: boolean): number {
  return degraded ? FORENSIC_ATTESTATION_MIN_VOID : FORENSIC_ATTESTATION_MIN_NORMAL;
}
